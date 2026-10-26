/**
 * POST /api/intake
 * Validates intake, rate-limits, stores, generates:
 *   1. ClientSnapshot (short, no implementation details) — returned to client
 *   2. AdminPreCallReport (full internal) — stored as adminReport, never sent to client
 *
 * Returns: { ok, intakeId, planId, snapshot }
 * The full plan result is fetched separately at GET /api/plan/:intakeId
 */

import { Router } from "express";
import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/db";
import { checkRateLimit } from "../lib/rateLimit";
import { sanitiseShortText, sanitiseText } from "../lib/sanitize";
import { generateBothOutputs } from "../lib/llm";
import { sendIntakeNotification } from "../lib/email";
import { hashIp } from "../lib/audit";

// ── Validation schema ─────────────────────────────────────────────────────────

const AREAS = ["executive_assistant", "marketing", "sales", "customer_support"] as const;
const TOOLS = ["chatgpt", "claude", "gemini", "grok", "copilot", "zapier_make", "crm", "none", "other"] as const;
const TIME_SINKS = ["email", "prospecting", "followups", "research", "proposals", "scheduling", "social_content", "admin", "personal_logistics"] as const;
const BIZ_SIZES = ["solo", "2-10", "11-50", "50+"] as const;
const HELP_STYLES = ["self_serve", "guided", "done_for_you", "not_sure"] as const;

const TOOL_BUDGETS = ["<$50/mo", "$50-150/mo", "$150-500/mo", "$500+/mo", "not_sure"] as const;
const WEEKLY_VOLUMES = ["<10/wk", "10-50/wk", "50-200/wk", "200+/wk", "varies"] as const;
const DAY_BLOCKS = ["morning_email", "client_work", "followups", "admin", "deep_work", "lunch", "personal"] as const;

const IntakeSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  role: z.string().min(1).max(100),
  industry: z.string().min(1).max(100),
  bizSize: z.enum(BIZ_SIZES),
  areas: z.array(z.enum(AREAS)).min(1).max(4),
  aiComfort: z.number().int().min(0).max(4),
  tools: z.array(z.enum(TOOLS)).min(1),
  timeSinks: z.array(z.enum(TIME_SINKS)).min(1),
  automateFirst: z.string().max(120).optional(),
  hoursLost: z.number().int().min(1).max(40),
  preferredHelp: z.enum(HELP_STYLES),
  freeText: z.string().max(280).optional(),
  // New tier-model fields
  toolBudget:       z.enum(TOOL_BUDGETS).optional(),
  currentSoftware:  z.string().max(300).optional(),
  weeklyVolumes:    z.enum(WEEKLY_VOLUMES).optional(),
  timezone: z.string().min(1).max(64).optional(),
  workDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  startMin: z.number().int().min(0).max(24 * 60).optional(),
  endMin: z.number().int().min(0).max(24 * 60).optional(),
  typicalDay: z.array(z.enum(DAY_BLOCKS)).max(7).optional(),
  typicalNote: z.string().max(280).optional(),
  dayScope: z.enum(["individual", "team"]).optional(),
  teamNote: z.string().max(200).optional(),
  honeypot: z.string().default(""),
}).superRefine((val, ctx) => {
  if (val.startMin != null && val.endMin != null && val.endMin <= val.startMin) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Work needs to end after it starts.", path: ["endMin"] });
  }
});

const router = Router();

router.post("/intake", async (req, res) => {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return res.status(429).json({ error: "Too many submissions. Please try again in 15 minutes." });
  }

  // ── Validate ─────────────────────────────────────────────────────────────
  const parsed = IntakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() });
  }
  const data = parsed.data;

  // ── Honeypot ─────────────────────────────────────────────────────────────
  if (data.honeypot && data.honeypot.length > 0) {
    return res.json({ ok: true }); // Silently discard bot submissions
  }

  // ── Sanitise free text ───────────────────────────────────────────────────
  const safe = {
    ...data,
    name: sanitiseShortText(data.name),
    role: sanitiseShortText(data.role),
    industry: sanitiseShortText(data.industry),
    automateFirst: data.automateFirst ? sanitiseShortText(data.automateFirst) : undefined,
    freeText: data.freeText ? sanitiseText(data.freeText) : undefined,
    typicalNote: data.typicalNote ? sanitiseText(data.typicalNote, 280) : undefined,
    teamNote: data.teamNote ? sanitiseText(data.teamNote, 200) : undefined,
    dayScope: data.bizSize === "2-10" ? data.dayScope : "individual",
  };
  if (safe.bizSize !== "2-10") safe.teamNote = undefined;

  // ── Store Intake record ──────────────────────────────────────────────────
  const intake = await prisma.intake.create({
    data: {
      email: safe.email.toLowerCase(),
      name: safe.name,
      answers: JSON.stringify(safe),
      areas: JSON.stringify(safe.areas),
      aiComfort: safe.aiComfort,
      hoursLost: safe.hoursLost,
      helpStyle: safe.preferredHelp,
      toolBudget:      safe.toolBudget ?? null,
      currentSoftware: safe.currentSoftware ? sanitiseText(safe.currentSoftware, 300) : null,
      weeklyVolumes:   safe.weeklyVolumes ?? null,
      ipHash: hashIp(ip),
      userAgent: req.headers["user-agent"]?.slice(0, 500) ?? null,
      status: "NEW",
    },
  });

  // ── Generate client snapshot + admin report ──────────────────────────────
  const { clientSnapshot, adminReport } = await generateBothOutputs({
    ...safe,
    helpStyle: safe.preferredHelp,
  });

  // ── Store Plan ────────────────────────────────────────────────────────────
  const plan = await prisma.plan.create({
    data: {
      intakeId: intake.id,
      aiReadinessLabel: clientSnapshot.aiReadinessLabel,
      aiReadinessSummary: clientSnapshot.aiReadinessSummary,
      focusAreas: JSON.stringify(clientSnapshot.focusAreas),
      recommendedTier: clientSnapshot.recommendedTier,
      tierRationale: clientSnapshot.tierRationale,
      ctaText: clientSnapshot.ctaText,
      adminReport: JSON.stringify(adminReport),
      source: clientSnapshot.source,
    },
  });

  // ── Also store in legacy IntakeSubmission for backward compat ────────────
  try {
    await prisma.intakeSubmission.create({
      data: {
        name: safe.name,
        email: safe.email,
        role: safe.role,
        industry: safe.industry,
        bizSize: safe.bizSize,
        areas: JSON.stringify(safe.areas),
        aiComfort: safe.aiComfort,
        tools: JSON.stringify(safe.tools),
        timeSinks: JSON.stringify(safe.timeSinks),
        automateFirst: safe.automateFirst,
        hoursLost: safe.hoursLost,
        preferredHelp: safe.preferredHelp,
        freeText: safe.freeText,
        honeypot: safe.honeypot,
        ipHash: hashIp(ip),
        llmResponse: JSON.stringify(clientSnapshot),
        responseType: clientSnapshot.source,
      },
    });
  } catch { /* non-critical */ }

  // ── Notify Shea (off by default) ─────────────────────────────────────────
  if (process.env.EMAIL_SEND_INTAKE_ALERTS === "true") {
    sendIntakeNotification(safe, intake.id).catch((e) => console.error("[email] intake alert failed:", e));
  }

  return res.json({
    ok: true,
    intakeId: intake.id,
    planId: plan.id,
    snapshot: clientSnapshot, // short client-facing snapshot
  });
});

export default router;
