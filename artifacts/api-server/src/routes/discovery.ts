/**
 * Discovery intake routes — adaptive, pre-auth intake form.
 *
 * Public:
 *   POST /api/discovery/start        — create a session, return first questions
 *   POST /api/discovery/next         — get next adaptive questions (server calls Grok)
 *   POST /api/discovery/submit       — finalize the intake
 *   POST /api/discovery/extract      — extract answers from pasted text or PDF
 *   GET  /api/discovery/questions    — list question bank (for client fallback rendering)
 *
 * Admin:
 *   GET  /api/admin/discovery        — list all intakes (inbox)
 *   GET  /api/admin/discovery/:id    — single intake detail
 *   PATCH /api/admin/discovery/:id   — update status or notes
 *   POST /api/admin/discovery/:id/report — generate report draft
 *   POST /api/admin/discovery/:id/approve — approve report (client can now see it)
 *
 * Cost controls:
 *   - INTAKE_ENABLED env (default true) kill switch
 *   - AI_CAP_INTAKE per-session token budget
 *   - Rate limit: max 5 start/next/submit requests per IP per minute (in-process)
 *   - Honeypot field on submit
 */

import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { createHash } from "crypto";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { audit } from "../lib/audit";
import {
  nextQuestion, extractFromDocument, generateReportDraft, buildTranscript,
  type AnsweredQuestion,
} from "../lib/discoveryAI";
import { sanitiseText, sanitiseShortText } from "../lib/sanitize";
import { QUESTION_BANK, QUESTION_MAP, FALLBACK_ORDER } from "../lib/questionBank";

const router = Router();

// ── Config ────────────────────────────────────────────────────────────────────

function intakeEnabled(): boolean {
  return process.env.INTAKE_ENABLED !== "false";
}

function hashIpDiscovery(ip: string | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT ?? "atg-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

// ── In-process rate limiting (per IP) ─────────────────────────────────────────

const ipRateMap = new Map<string, number[]>();

function checkIpRate(ip: string | undefined, max = 5): boolean {
  if (!ip) return true;
  const key = hashIpDiscovery(ip) ?? ip;
  const now = Date.now();
  const window = 60_000;
  const timestamps = (ipRateMap.get(key) ?? []).filter((t) => now - t < window);
  if (timestamps.length >= max) return false;
  timestamps.push(now);
  ipRateMap.set(key, timestamps);
  return true;
}

// ── Multer for PDF uploads (in-memory, 5 MB max) ──────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.mimetype);
    cb(null, ok);
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const AnswerSchema = z.object({
  id:       z.string().min(1).max(80),
  category: z.string().min(1).max(60),
  question: z.string().min(1).max(500),
  answer:   z.string().min(1).max(4000),
});

async function getOrVerifySession(id: string): Promise<{ id: string; answers: AnsweredQuestion[]; tokensUsed: number } | null> {
  const rec = await prisma.discoveryIntake.findUnique({ where: { id }, select: { id: true, answers: true, tokensUsed: true } });
  if (!rec) return null;
  const answers: AnsweredQuestion[] = (() => { try { return JSON.parse(rec.answers) as AnsweredQuestion[]; } catch { return []; } })();
  return { id: rec.id, answers, tokensUsed: rec.tokensUsed };
}

// ── GET /api/discovery/questions — static question bank ───────────────────────

router.get("/discovery/questions", (_req, res) => {
  res.json({ questions: QUESTION_BANK, fallbackOrder: FALLBACK_ORDER });
});

// ── POST /api/discovery/start ─────────────────────────────────────────────────

router.post("/discovery/start", async (req, res) => {
  if (!intakeEnabled()) {
    res.status(503).json({ error: "Discovery intake is temporarily unavailable." });
    return;
  }
  const ip = req.ip;
  if (!checkIpRate(ip, 10)) {
    res.status(429).json({ error: "Too many requests. Please wait a moment." });
    return;
  }

  const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  const intake = await prisma.discoveryIntake.create({
    data: { ipHash: hashIpDiscovery(ip), expiresAt: expires },
  });

  // Always start with core questions
  const coreIds = ["contact_name", "contact_email", "company_name", "role", "business_type", "team_size"];
  const firstQuestions = coreIds
    .map((id) => QUESTION_MAP[id])
    .filter((q): q is NonNullable<typeof q> => !!q);

  res.json({
    sessionId: intake.id,
    questions: firstQuestions,
    totalAsked: 0,
    done: false,
  });
});

// ── POST /api/discovery/next ──────────────────────────────────────────────────

const NextBody = z.object({
  sessionId: z.string().min(1),
  answers:   z.array(AnswerSchema).min(1).max(30),
});

router.post("/discovery/next", async (req, res) => {
  if (!intakeEnabled()) { res.status(503).json({ error: "Intake unavailable." }); return; }
  if (!checkIpRate(req.ip)) { res.status(429).json({ error: "Too many requests." }); return; }

  const parsed = NextBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "sessionId and at least one answer are required." }); return; }

  const session = await getOrVerifySession(parsed.data.sessionId);
  if (!session) { res.status(404).json({ error: "Session not found. Start a new intake." }); return; }

  // Sanitise and merge new answers
  const newAnswers: AnsweredQuestion[] = parsed.data.answers.map((a) => ({
    id:       a.id,
    category: a.category,
    question: sanitiseShortText(a.question),
    answer:   sanitiseText(a.answer, 4000),
  }));

  const existingIds = new Set(session.answers.map((a) => a.id));
  const merged = [
    ...session.answers,
    ...newAnswers.filter((a) => !existingIds.has(a.id)),
  ];

  // Save merged answers
  await prisma.discoveryIntake.update({
    where: { id: session.id },
    data:  { answers: JSON.stringify(merged), transcript: buildTranscript(merged) },
  });

  // Get next questions from AI
  const result = await nextQuestion(merged, session.tokensUsed);

  // Update token count
  if (result.tokensUsed > 0) {
    await prisma.discoveryIntake.update({
      where: { id: session.id },
      data:  { tokensUsed: { increment: result.tokensUsed } },
    });
  }

  const nextQuestions = result.nextIds
    .map((id) => QUESTION_MAP[id])
    .filter((q): q is NonNullable<typeof q> => !!q);

  res.json({
    questions: nextQuestions,
    totalAsked: merged.length,
    done: result.done || merged.length >= 25,
    fromFallback: result.fromFallback ?? false,
  });
});

// ── POST /api/discovery/submit ────────────────────────────────────────────────

const SubmitBody = z.object({
  sessionId:    z.string().min(1),
  finalAnswers: z.array(AnswerSchema),
  contactEmail: z.string().email().optional(),
  contactName:  z.string().max(100).optional(),
  consentGiven: z.boolean(),
  honeypot:     z.string().max(0).optional(), // must be empty
});

router.post("/discovery/submit", async (req, res) => {
  if (!intakeEnabled()) { res.status(503).json({ error: "Intake unavailable." }); return; }
  if (!checkIpRate(req.ip, 3)) { res.status(429).json({ error: "Too many submissions. Wait a moment." }); return; }

  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }
  if (parsed.data.honeypot) { res.json({ ok: true }); return; } // silent reject

  const session = await getOrVerifySession(parsed.data.sessionId);
  if (!session) { res.status(404).json({ error: "Session not found." }); return; }

  if (!parsed.data.consentGiven) {
    res.status(422).json({ error: "You must agree to our privacy policy to submit." });
    return;
  }

  const allAnswers: AnsweredQuestion[] = [
    ...session.answers,
    ...parsed.data.finalAnswers.filter((a) => !session.answers.find((e) => e.id === a.id)).map((a) => ({
      id: a.id, category: a.category,
      question: sanitiseShortText(a.question),
      answer: sanitiseText(a.answer, 4000),
    })),
  ];

  const email = parsed.data.contactEmail;
  const name = parsed.data.contactName
    ? sanitiseShortText(parsed.data.contactName)
    : allAnswers.find((a) => a.id === "contact_name")?.answer ?? null;

  const emailFromAnswers = allAnswers.find((a) => a.id === "contact_email")?.answer ?? null;
  const finalEmail = email ?? (typeof emailFromAnswers === "string" ? emailFromAnswers : null);

  await prisma.discoveryIntake.update({
    where: { id: session.id },
    data:  {
      answers:      JSON.stringify(allAnswers),
      transcript:   buildTranscript(allAnswers),
      contactEmail: finalEmail,
      contactName:  name,
      consentGiven: true,
      status:       "new",
    },
  });

  res.json({ ok: true, sessionId: session.id });
});

// ── POST /api/discovery/extract — parse pasted text or PDF ───────────────────

router.post("/discovery/extract", upload.single("file"), async (req, res) => {
  if (!intakeEnabled()) { res.status(503).json({ error: "Intake unavailable." }); return; }
  if (!checkIpRate(req.ip, 5)) { res.status(429).json({ error: "Too many requests." }); return; }

  let text = "";

  if (req.file) {
    if (req.file.mimetype === "application/pdf") {
      try {
        // pdf-parse exports differ across module systems; use a type-safe cast
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfMod: any = await import("pdf-parse");
        const pdfParse = (pdfMod.default ?? pdfMod) as (buf: Buffer) => Promise<{ text: string }>;
        const data = await pdfParse(req.file.buffer);
        text = data.text;
      } catch {
        res.status(422).json({ error: "Could not extract text from PDF. Try pasting the content instead." });
        return;
      }
    } else {
      text = req.file.buffer.toString("utf8");
    }
  } else {
    const bodyText = z.object({ text: z.string().min(10).max(30_000) }).safeParse(req.body);
    if (!bodyText.success) { res.status(422).json({ error: "Paste text or upload a PDF." }); return; }
    text = bodyText.data.text;
  }

  const result = await extractFromDocument(sanitiseText(text, 8000));

  res.json({
    answers:    result.answers,
    gapIds:     result.gapIds,
    tokensUsed: result.tokensUsed,
  });
});

// ── Admin: list intakes ───────────────────────────────────────────────────────

router.get("/admin/discovery", withUser, requireAdmin, async (req, res) => {
  const { status, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const where = status ? { status } : {};
  const intakes = await prisma.discoveryIntake.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(parseInt(limit), 200),
    skip: parseInt(offset),
    select: {
      id: true, contactEmail: true, contactName: true, status: true,
      reportApprovedAt: true, tokensUsed: true, consentGiven: true,
      createdAt: true, updatedAt: true, expiresAt: true, clientId: true,
    },
  });
  const total = await prisma.discoveryIntake.count({ where });
  res.json({ intakes, total });
});

router.get("/admin/discovery/:id", withUser, requireAdmin, async (req, res) => {
  const intake = await prisma.discoveryIntake.findUnique({ where: { id: req.params.id as string } });
  if (!intake) { res.status(404).json({ error: "Not found." }); return; }
  res.json(intake);
});

const AdminPatch = z.object({
  status:      z.enum(["new", "reviewed", "report_sent", "converted"]).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail:z.string().email().optional(),
});

router.patch("/admin/discovery/:id", withUser, requireAdmin, async (req, res) => {
  const parsed = AdminPatch.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed." }); return; }
  const updated = await prisma.discoveryIntake.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  });
  res.json(updated);
});

// ── Admin: generate report draft ──────────────────────────────────────────────

router.post("/admin/discovery/:id/report", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const intake = await prisma.discoveryIntake.findUnique({ where: { id: req.params.id as string } });
  if (!intake) { res.status(404).json({ error: "Not found." }); return; }

  const answers: AnsweredQuestion[] = (() => {
    try { return JSON.parse(intake.answers) as AnsweredQuestion[]; } catch { return []; }
  })();

  // Load available workflow slugs from DB
  const templates = await prisma.workflowTemplate.findMany({
    where: { enabled: true },
    select: { slug: true, name: true },
    orderBy: { slug: "asc" },
  });

  const draft = await generateReportDraft(
    answers,
    intake.contactName ?? "Prospect",
    answers.find((a) => a.id === "company_name")?.answer ?? "their company",
    templates.map((t) => t.slug),
  );

  const { tokensUsed, ...reportData } = draft;

  await prisma.discoveryIntake.update({
    where: { id: intake.id },
    data:  {
      reportDraft: JSON.stringify(reportData),
      status: "reviewed",
      tokensUsed: { increment: tokensUsed },
    },
  });

  await audit({
    actorUserId: actor.id,
    action: "DISCOVERY_REPORT_GENERATED",
    entity: "DiscoveryIntake",
    entityId: intake.id,
    meta: { tokensUsed },
  });

  res.json({ ok: true, report: reportData, tokensUsed });
});

// ── Admin: approve report (client can now see it after sign-in) ───────────────

router.post("/admin/discovery/:id/approve", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const intake = await prisma.discoveryIntake.findUnique({ where: { id: req.params.id as string } });
  if (!intake) { res.status(404).json({ error: "Not found." }); return; }
  if (!intake.reportDraft) { res.status(400).json({ error: "Generate a report draft first." }); return; }

  await prisma.discoveryIntake.update({
    where: { id: intake.id },
    data:  { reportApprovedAt: new Date(), status: "report_sent" },
  });

  await audit({
    actorUserId: actor.id,
    action: "DISCOVERY_REPORT_APPROVED",
    entity: "DiscoveryIntake",
    entityId: intake.id,
    meta: { contactEmail: intake.contactEmail },
  });

  res.json({ ok: true });
});

// ── Admin: convert intake to client ──────────────────────────────────────────

router.post("/admin/discovery/:id/convert", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const intake = await prisma.discoveryIntake.findUnique({ where: { id: req.params.id as string } });
  if (!intake) { res.status(404).json({ error: "Not found." }); return; }

  const answers: AnsweredQuestion[] = (() => {
    try { return JSON.parse(intake.answers) as AnsweredQuestion[]; } catch { return []; }
  })();

  const bizType = answers.find((a) => a.id === "business_type")?.answer ?? null;
  const teamSize = answers.find((a) => a.id === "team_size")?.answer ?? null;
  const suggestedTier = (() => {
    try {
      const rd = JSON.parse(intake.reportDraft ?? "{}") as { suggestedTier?: string };
      return rd.suggestedTier ?? "NONE";
    } catch { return "NONE"; }
  })();

  // Create user + client if email is known
  if (!intake.contactEmail) {
    res.status(400).json({ error: "No contact email on this intake. Update it first." });
    return;
  }

  // Find or create a User by email
  let user = await prisma.user.findUnique({ where: { email: intake.contactEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: intake.contactEmail, name: intake.contactName, role: "CLIENT" },
    });
  }

  let client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        userId: user.id,
        industry: bizType,
        size: teamSize,
        tier: suggestedTier,
        status: "PROSPECT",
        areas: JSON.stringify(answers.filter((a) => a.category === "sales" || a.category === "operations").map((a) => a.category).slice(0, 3)),
        aiLevel: 1,
        helpStyle: answers.find((a) => a.id === "ai_comfort")?.answer?.toLowerCase().includes("comfortable") ? "guided" : "not_sure",
      },
    });
  }

  await prisma.discoveryIntake.update({
    where: { id: intake.id },
    data:  { clientId: client.id, status: "converted", expiresAt: new Date("2099-01-01") },
  });

  await audit({
    actorUserId: actor.id,
    action: "DISCOVERY_CONVERTED",
    entity: "DiscoveryIntake",
    entityId: intake.id,
    meta: { clientId: client.id, email: intake.contactEmail },
  });

  res.json({ ok: true, clientId: client.id, userId: user.id });
});

export default router;
