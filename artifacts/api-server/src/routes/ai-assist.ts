/**
 * AI Assist routes — Setup Coach, Skill Customizer, Troubleshooter, Report Refresh.
 *
 * All routes enforce:
 *   - AI_ASSIST_ENABLED kill switch
 *   - Per-minute rate limit (in-process)
 *   - Monthly token cap by tier
 *   - Max image size for vision calls
 *   - Conversation log retained for AI_CHAT_LOG_RETENTION_DAYS
 *
 * Product boundary: no external connectors, no sending, no storage of
 * client email/calendar contents. Pasted samples only, short retention.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import {
  isEnabled, DEFAULT_MODEL, VISION_MODEL, TOKEN_PRICE_INPUT, TOKEN_PRICE_OUTPUT,
  checkRateLimit, checkAndUpdateUsage, logMessages,
  buildClientContext, getRecentHistory, callAssist,
  coachSystemPrompt, customizerSystemPrompt, troubleshooterSystemPrompt,
} from "../lib/ai-assist";
import { generateBothOutputs, generateToolPlan } from "../lib/llm";
import { sanitiseText } from "../lib/sanitize";

const router = Router();
router.use(withUser, requireAuth);

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

// ── Shared gate ───────────────────────────────────────────────────────────────

function gateEnabled(res: Parameters<typeof requireAuth>[1]): boolean {
  if (!isEnabled()) {
    (res as import("express").Response).status(503).json({
      error: "AI Assist is not enabled. Set AI_ASSIST_ENABLED=true in Replit Secrets.",
    });
    return false;
  }
  return true;
}

async function gateAccess(
  req: AuthedRequest,
  res: import("express").Response,
  feature: string,
  estimatedTokens: number,
): Promise<{ clientId: string; tier: string } | null> {
  if (!gateEnabled(res)) return null;

  // When admin is impersonating: use effectiveClientId for context but never count quota
  const isImp = req.atgUser?.isImpersonating ?? false;
  const clientId = isImp
    ? (req.atgUser?.effectiveClientId ?? null)
    : (req.atgUser?.clientId ?? null);

  if (!clientId) {
    res.status(403).json({ error: "Complete the intake first to access AI Assist." });
    return null;
  }

  if (!isImp && !checkRateLimit(clientId)) {
    res.status(429).json({ error: "Too many requests. Wait a minute before trying again." });
    return null;
  }

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { tier: true } });
  const tier = client?.tier ?? "NONE";

  if (!isImp) {
    // Only count quota for real (non-impersonating) calls
    const { allowed, used, cap } = await checkAndUpdateUsage(clientId, tier, feature, estimatedTokens);
    if (!allowed) {
      res.status(429).json({
        error: `Monthly AI usage limit reached (${used.toLocaleString()} / ${cap.toLocaleString()} tokens). Limit resets next month.`,
        used, cap,
      });
      return null;
    }
  }

  return { clientId, tier };
}

// ── 1. Setup Coach ────────────────────────────────────────────────────────────

const CoachBody = z.object({
  message: z.string().min(1).max(1000),
});

router.post("/ai-assist/coach", async (req, res) => {
  const parsed = CoachBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "message is required (max 1 000 chars)." }); return; }

  const gate = await gateAccess(req as AuthedRequest, res, "coach", 800);
  if (!gate) return;
  const { clientId } = gate;

  const ctx = await buildClientContext(clientId);
  if (!ctx) { res.status(404).json({ error: "No client profile." }); return; }

  const system = coachSystemPrompt(ctx);
  const history = await getRecentHistory(clientId, "coach");
  const user = sanitiseText(parsed.data.message, 1000);

  const result = await callAssist({ system, history, user, maxTokens: 500, model: DEFAULT_MODEL }).catch((err) => {
    res.status(500).json({ error: err instanceof Error ? err.message : "AI call failed." });
    return null;
  });
  if (!result) return;

  if (!result.fromCache) {
    await logMessages(clientId, "coach", user, result.content, result.tokens, result.model);
  }

  res.json({ reply: result.content, tokens: result.tokens, fromCache: result.fromCache });
});

// ── 2. Skill / Routine Customizer ─────────────────────────────────────────────

const CustomizerBody = z.object({
  slug:     z.string().min(1).max(80),
  platform: z.enum(["grok_bot", "claude", "chatgpt"]),
  context:  z.string().max(500).optional(), // optional extra context from client
});

router.post("/ai-assist/customize-skill", async (req, res) => {
  const parsed = CustomizerBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "slug and platform are required." }); return; }

  const gate = await gateAccess(req as AuthedRequest, res, "customize", 1500);
  if (!gate) return;
  const { clientId } = gate;

  const [template, ctx] = await Promise.all([
    prisma.workflowTemplate.findUnique({ where: { slug: parsed.data.slug } }),
    buildClientContext(clientId),
  ]);
  if (!template) { res.status(404).json({ error: "Workflow template not found." }); return; }

  // Tier check: client must have access to this workflow (respects BILLING_ENABLED bypass)
  const { checkWorkflowAccess } = await import("../lib/access");
  const acc = await checkWorkflowAccess(clientId, parsed.data.slug);
  if (!acc.allowed) { res.status(403).json({ error: acc.reason }); return; }

  const platformLabel = { grok_bot: "Grok Bot", claude: "Claude", chatgpt: "ChatGPT" }[parsed.data.platform];
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { user: { select: { name: true } }, industry: true },
  });

  const userPrompt = [
    `Workflow name: ${template.name}`,
    `Platform: ${platformLabel}`,
    `Description: ${template.description}`,
    ``,
    `Original system prompt:`,
    template.systemPrompt.slice(0, 1500),
    ``,
    `Original user prompt template:`,
    template.userPromptTemplate.slice(0, 800),
    ``,
    ctx?.industry ? `Client industry: ${ctx.industry}` : "",
    client?.user?.name ? `Client / business name: ${client.user.name}` : "",
    ctx?.toolPlanSummary ? `Their tools:\n${ctx.toolPlanSummary.slice(0, 400)}` : "",
    parsed.data.context ? `Extra context: ${sanitiseText(parsed.data.context, 500)}` : "",
  ].filter(Boolean).join("\n");

  // If AI is not available, return a static customization using the template's actual prompt
  if (!isEnabled()) {
    const { renderSkillMd, ROUTINE_PROMPTS } = await import("../lib/templates");
    const skillMd = renderSkillMd(template, undefined, {
      businessName: client?.user?.name ?? undefined,
      senderName: client?.user?.name ?? undefined,
      industry: ctx?.industry ?? undefined,
    });
    const routinePrompts = ROUTINE_PROMPTS[parsed.data.slug];
    const routinePrompt = routinePrompts?.[parsed.data.platform as keyof typeof routinePrompts] ?? "";
    res.json({ skillMd, routinePrompt, tokens: 0, fromCache: false, staticFallback: true });
    return;
  }

  const result = await callAssist({
    system: customizerSystemPrompt(),
    history: [],
    user: userPrompt,
    maxTokens: 1200,
    model: DEFAULT_MODEL,
  }).catch((err) => {
    res.status(500).json({ error: err instanceof Error ? err.message : "AI call failed." });
    return null;
  });
  if (!result) return;

  // Safe split: if the separator is missing, treat all content as SKILL.md
  const separatorIdx = result.content.indexOf("---ROUTINE---");
  const skillMd      = (separatorIdx >= 0 ? result.content.slice(0, separatorIdx) : result.content).trim();
  const routinePrompt = (separatorIdx >= 0 ? result.content.slice(separatorIdx + "---ROUTINE---".length) : "").trim();

  if (!result.fromCache) {
    await logMessages(clientId, "customize", userPrompt, result.content, result.tokens, result.model);
  }

  res.json({ skillMd, routinePrompt, tokens: result.tokens, fromCache: result.fromCache });
});

// ── 3. Troubleshooter ─────────────────────────────────────────────────────────

const MAX_IMAGE_B64_CHARS = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 100;

const TroubleshootBody = z.object({
  errorText:   z.string().min(1).max(2000),
  imageBase64: z.string().max(MAX_IMAGE_B64_CHARS).optional(),
  imageMime:   z.enum(["image/png", "image/jpeg", "image/webp"]).optional(),
});

router.post("/ai-assist/troubleshoot", async (req, res) => {
  const parsed = TroubleshootBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "errorText is required. Image must be ≤2 MB PNG/JPEG/WebP." }); return; }

  const useVision = !!parsed.data.imageBase64;
  const estimatedTokens = useVision ? 2000 : 900;

  const gate = await gateAccess(req as AuthedRequest, res, "troubleshoot", estimatedTokens);
  if (!gate) return;
  const { clientId } = gate;

  const ctx = await buildClientContext(clientId);
  if (!ctx) { res.status(404).json({ error: "No client profile." }); return; }

  const history = await getRecentHistory(clientId, "troubleshoot");
  const user = sanitiseText(parsed.data.errorText, 2000);

  const result = await callAssist({
    system: troubleshooterSystemPrompt(ctx),
    history,
    user,
    maxTokens: 700,
    model: useVision ? VISION_MODEL : DEFAULT_MODEL,
    imageBase64: parsed.data.imageBase64,
    imageMime:   parsed.data.imageMime,
  }).catch((err) => {
    res.status(500).json({ error: err instanceof Error ? err.message : "AI call failed." });
    return null;
  });
  if (!result) return;

  if (!result.fromCache) {
    await logMessages(clientId, "troubleshoot", user, result.content, result.tokens, result.model);
  }

  res.json({ reply: result.content, tokens: result.tokens, fromCache: result.fromCache });
});

// ── 4. Report Refresh ─────────────────────────────────────────────────────────

// In-memory rate limit: 1 refresh per client per hour
const refreshCooldown = new Map<string, number>();

router.post("/ai-assist/report-refresh", async (req, res) => {
  const gate = await gateAccess(req as AuthedRequest, res, "refresh", 2000);
  if (!gate) return;
  const { clientId } = gate;

  // Hourly cooldown
  const lastRefresh = refreshCooldown.get(clientId) ?? 0;
  if (Date.now() - lastRefresh < 60 * 60 * 1000) {
    const waitMin = Math.ceil((60 * 60 * 1000 - (Date.now() - lastRefresh)) / 60000);
    res.status(429).json({ error: `Report refresh is rate-limited. Try again in ${waitMin} minute${waitMin !== 1 ? "s" : ""}.` });
    return;
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      user: { select: { name: true } },
      intakes: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!client) { res.status(404).json({ error: "No client profile." }); return; }
  const intake = client.intakes[0];
  if (!intake) { res.status(404).json({ error: "No intake on file. Complete the intake first." }); return; }

  refreshCooldown.set(clientId, Date.now());

  const answers: Record<string, unknown> = (() => { try { return JSON.parse(intake.answers ?? "{}") as Record<string, unknown>; } catch { return {}; } })();
  const areas: string[] = (() => { try { return JSON.parse(intake.areas ?? "[]") as string[]; } catch { return []; } })();

  const [{ clientSnapshot, adminReport }, toolPlanOutput] = await Promise.all([
    generateBothOutputs({
      name: client.user?.name ?? intake.name,
      email: intake.email,
      industry: (answers.industry as string | undefined) ?? client.industry ?? "unknown",
      areas,
      aiComfort: intake.aiComfort,
      helpStyle: intake.helpStyle ?? "not_sure",
      hoursLost: intake.hoursLost ?? 10,
      timeSinks: Array.isArray(answers.timeSinks) ? (answers.timeSinks as string[]) : [],
      role: (answers.role as string | undefined) ?? client.roleTitle ?? "Business owner",
      bizSize: (answers.bizSize as string | undefined) ?? client.size ?? "solo",
      tools: Array.isArray(answers.tools) ? (answers.tools as string[]) : [],
      automateFirst: typeof answers.automateFirst === "string" ? answers.automateFirst : undefined,
      freeText: typeof answers.freeText === "string" ? answers.freeText : undefined,
    }),
    generateToolPlan({
      industry: (answers.industry as string | undefined) ?? client.industry ?? "unknown",
      areas,
      aiComfort: intake.aiComfort,
      toolBudget: intake.toolBudget ?? undefined,
      currentSoftware: intake.currentSoftware ?? undefined,
      weeklyVolumes: intake.weeklyVolumes ?? undefined,
      timeSinks: Array.isArray(answers.timeSinks) ? (answers.timeSinks as string[]) : [],
      aiPlatforms: Array.isArray(answers.aiPlatforms) ? (answers.aiPlatforms as string[]) : [],
    }),
  ]);

  // Generate a diff summary for Guided/DFY clients comparing new vs old plan
  let refreshDiff: string | undefined;
  const prevPlan = (client.tier === "GUIDED" || client.tier === "WHITE_GLOVE")
    ? await prisma.plan.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" }, select: { recommendedTier: true, focusAreas: true } })
    : null;
  if ((client.tier === "GUIDED" || client.tier === "WHITE_GLOVE") && prevPlan) {
    const prevTier = prevPlan.recommendedTier;
    const newTier = clientSnapshot.recommendedTier;
    const prevAreas: { name: string }[] = (() => { try { return JSON.parse(prevPlan.focusAreas) as { name: string }[]; } catch { return []; } })();
    const newAreas = clientSnapshot.focusAreas;
    const tierChanged = prevTier !== newTier;
    const areaNames = (arr: { name: string }[]) => arr.map((a) => a.name).join(", ");
    refreshDiff = [
      tierChanged ? `Tier recommendation changed: ${prevTier} → ${newTier}` : `Tier unchanged: ${newTier}`,
      `Previous focus areas: ${areaNames(prevAreas) || "none"}`,
      `New focus areas: ${areaNames(newAreas) || "none"}`,
      `Readiness: ${clientSnapshot.aiReadinessLabel}`,
    ].join("\n");
  }

  const plan = await prisma.plan.create({
    data: {
      intakeId: intake.id,
      clientId,
      aiReadinessLabel: clientSnapshot.aiReadinessLabel,
      aiReadinessSummary: clientSnapshot.aiReadinessSummary,
      focusAreas: JSON.stringify(clientSnapshot.focusAreas),
      recommendedTier: clientSnapshot.recommendedTier,
      tierRationale: clientSnapshot.tierRationale,
      ctaText: clientSnapshot.ctaText,
      adminReport: JSON.stringify(adminReport),
      source: clientSnapshot.source,
      refreshDiff,
    },
  });

  // Auto-approve tool plan
  await prisma.toolPlan.create({
    data: {
      clientId,
      intakeId: intake.id,
      toolsJson: JSON.stringify(toolPlanOutput.tools),
      stepsJson: JSON.stringify(toolPlanOutput.steps),
      source: toolPlanOutput.source,
      status: "approved",
      approvedAt: new Date(),
    },
  });

  res.json({
    ok: true,
    planId: plan.id,
    recommendedTier: plan.recommendedTier,
    refreshDiff: refreshDiff ?? null,
    message: "Your plan has been refreshed. Check the My Plan page for updates.",
  });
});

// ── Client: usage meter ───────────────────────────────────────────────────────

router.get("/ai-assist/usage", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.json({ used: 0, cap: 0, month: "" }); return; }

  const client = await prisma.client.findUnique({ where: { id: user.clientId }, select: { tier: true } });
  const tier = client?.tier ?? "NONE";
  const capMap: Record<string, number> = {
    SELF_SERVE: parseInt(process.env.AI_CAP_SELF_SERVE ?? "50000", 10),
    GUIDED:     parseInt(process.env.AI_CAP_GUIDED ?? "150000", 10),
    WHITE_GLOVE:parseInt(process.env.AI_CAP_DFY ?? "500000", 10),
    NONE:       parseInt(process.env.AI_CAP_SELF_SERVE ?? "50000", 10),
  };
  const cap = capMap[tier] ?? 50000;
  const month = new Date().toISOString().slice(0, 7);

  const usage = await prisma.aIAssistUsage.findUnique({
    where: { clientId_month_feature: { clientId: user.clientId, month, feature: "all" } },
  });

  const byFeature = await prisma.aIAssistUsage.findMany({
    where: { clientId: user.clientId, month, feature: { not: "all" } },
    select: { feature: true, tokenCount: true, messageCount: true },
  });

  res.json({ used: usage?.tokenCount ?? 0, cap, month, byFeature, enabled: isEnabled() });
});

// ── Admin: usage table + chat log ─────────────────────────────────────────────

router.get("/admin/ai-assist/usage", withUser, requireAdmin, async (_req, res) => {
  const month = new Date().toISOString().slice(0, 7);

  const rows = await prisma.aIAssistUsage.groupBy({
    by: ["clientId"],
    where: { month, feature: "all" },
    _sum: { tokenCount: true, messageCount: true },
    orderBy: { _sum: { tokenCount: "desc" } },
    take: 100,
  });

  const clientIds = rows.map((r) => r.clientId);
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, tier: true, user: { select: { name: true, email: true } } },
  });
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  // Cost estimate: (tokens × price/1K) × 50% input / 50% output split (rough)
  const pricePerToken = (TOKEN_PRICE_INPUT + TOKEN_PRICE_OUTPUT) / 2 / 1000;

  res.json({
    month,
    disclaimer: "Cost estimates are approximate (input/output split assumed 50/50). Verify against your xAI billing.",
    rows: rows.map((r) => {
      const c = clientMap[r.clientId];
      const tokens = r._sum.tokenCount ?? 0;
      return {
        clientId: r.clientId,
        name: c?.user?.name ?? "—",
        email: c?.user?.email ?? "—",
        tier: c?.tier ?? "—",
        messages: r._sum.messageCount ?? 0,
        tokens,
        estimatedCostUsd: parseFloat((tokens * pricePerToken).toFixed(4)),
      };
    }),
  });
});

router.get("/admin/ai-assist/log/:clientId", withUser, requireAdmin, async (req, res) => {
  const messages = await prisma.aIAssistMessage.findMany({
    where: { clientId: req.params.clientId as string },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, feature: true, role: true, content: true, tokens: true, model: true, createdAt: true },
  });
  res.json(messages);
});

// ── Admin: Grok health check ──────────────────────────────────────────────────

router.get("/admin/ai-assist/health", withUser, requireAdmin, async (_req, res) => {
  const { grokHealthCheck, GROK_MODEL } = await import("../lib/grokClient");
  const result = await grokHealthCheck();
  res.json({ ...result, timestamp: new Date().toISOString(), model: GROK_MODEL });
});

export default router;
