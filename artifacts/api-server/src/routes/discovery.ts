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

// ── Personal invite links ─────────────────────────────────────────────────────

import { randomBytes } from "crypto";

function makeInviteToken(): string {
  return randomBytes(12).toString("base64url");
}

const InviteBody = z.object({
  prefilledName:     z.string().max(100).optional(),
  prefilledCompany:  z.string().max(200).optional(),
  prefilledIndustry: z.string().max(100).optional(),
  contextNote:       z.string().max(1000).optional(),
});

// Public: validate + return prefill data for an invite link
router.get("/discovery/invite/:token", async (req, res) => {
  const inv = await prisma.discoveryInvite.findUnique({
    where: { token: req.params.token as string },
    select: {
      id: true, prefilledName: true, prefilledCompany: true, prefilledIndustry: true,
      status: true, expiresAt: true, revokedAt: true,
    },
  });
  if (!inv) { res.status(404).json({ error: "Invite link not found." }); return; }
  if (inv.revokedAt || inv.status === "revoked") { res.status(410).json({ error: "This invite link has been revoked." }); return; }
  if (inv.expiresAt < new Date()) { res.status(410).json({ error: "This invite link has expired." }); return; }
  res.json({
    prefilledName: inv.prefilledName,
    prefilledCompany: inv.prefilledCompany,
    prefilledIndustry: inv.prefilledIndustry,
    status: inv.status,
  });
});

// Public: update invite status as prospect progresses
router.patch("/discovery/invite/:token/status", async (req, res) => {
  const parsed = z.object({ status: z.enum(["opened", "in_progress", "submitted"]) }).safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid status." }); return; }

  const inv = await prisma.discoveryInvite.findUnique({ where: { token: req.params.token as string } });
  if (!inv || inv.revokedAt || inv.expiresAt < new Date()) { res.status(404).json({ error: "Invite not found." }); return; }

  await prisma.discoveryInvite.update({
    where: { id: inv.id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === "submitted" && req.body.intakeId ? { discoveryIntakeId: req.body.intakeId as string } : {}),
    },
  });
  res.json({ ok: true });
});

// Admin: create invite
router.post("/admin/discovery/invite", withUser, requireAdmin, async (req, res) => {
  const parsed = InviteBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }
  const token = makeInviteToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const inv = await prisma.discoveryInvite.create({
    data: { token, expiresAt, ...parsed.data },
  });
  res.status(201).json({ ...inv, link: `/intake/i/${token}` });
});

// Admin: list invites
router.get("/admin/discovery/invites", withUser, requireAdmin, async (_req, res) => {
  const invites = await prisma.discoveryInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(invites.map((inv) => ({ ...inv, link: `/intake/i/${inv.token}` })));
});

// Admin: revoke invite
router.delete("/admin/discovery/invites/:id", withUser, requireAdmin, async (req, res) => {
  await prisma.discoveryInvite.update({
    where: { id: req.params.id as string },
    data: { revokedAt: new Date(), status: "revoked" },
  });
  res.json({ ok: true });
});

// ── Proposal ──────────────────────────────────────────────────────────────────

const ProposalPatch = z.object({
  reviewSummary:   z.string().max(10000).optional(),
  execSummary:     z.string().max(10000).optional(),
  understanding:   z.string().max(10000).optional(),
  scope:           z.string().max(10000).optional(),
  howWeConnect:    z.string().max(10000).optional(),
  milestones:      z.string().max(10000).optional(),
  investment:      z.string().max(5000).optional(),
  acceptanceClause:z.string().max(5000).optional(),
});

// Admin: generate proposal draft using Grok
router.post("/admin/discovery/:id/proposal", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const intake = await prisma.discoveryIntake.findUnique({ where: { id: req.params.id as string } });
  if (!intake) { res.status(404).json({ error: "Intake not found." }); return; }

  // Also load the existing report draft if available
  const answers: AnsweredQuestion[] = (() => {
    try { return JSON.parse(intake.answers) as AnsweredQuestion[]; } catch { return []; }
  })();
  const reportDraft: Record<string, unknown> = (() => {
    try { return intake.reportDraft ? JSON.parse(intake.reportDraft) as Record<string, unknown> : {}; } catch { return {}; }
  })();

  // Derive proposal content from report draft + LLM call
  const proposalContent = await generateProposalDraft(answers, reportDraft, intake.contactName ?? "Prospect");
  const { tokensUsed, ...content } = proposalContent;

  const proposal = await prisma.discoveryProposal.upsert({
    where: { discoveryIntakeId: intake.id },
    create: { discoveryIntakeId: intake.id, ...content },
    update: content,
  });

  await prisma.discoveryIntake.update({
    where: { id: intake.id },
    data: { tokensUsed: { increment: tokensUsed } },
  });

  await audit({
    actorUserId: actor.id,
    action: "PROPOSAL_GENERATED",
    entity: "DiscoveryIntake",
    entityId: intake.id,
    meta: { tokensUsed },
  });

  res.json({ ok: true, proposal });
});

// Admin: edit proposal
router.patch("/admin/discovery/:id/proposal", withUser, requireAdmin, async (req, res) => {
  const parsed = ProposalPatch.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }
  const proposal = await prisma.discoveryProposal.findUnique({ where: { discoveryIntakeId: req.params.id as string } });
  if (!proposal) { res.status(404).json({ error: "No proposal draft. Generate one first." }); return; }
  const updated = await prisma.discoveryProposal.update({
    where: { id: proposal.id },
    data: parsed.data,
  });
  res.json(updated);
});

// Admin: get proposal
router.get("/admin/discovery/:id/proposal", withUser, requireAdmin, async (req, res) => {
  const proposal = await prisma.discoveryProposal.findUnique({ where: { discoveryIntakeId: req.params.id as string } });
  if (!proposal) { res.status(404).json({ error: "No proposal yet." }); return; }
  res.json(proposal);
});

// Admin: approve proposal
router.post("/admin/discovery/:id/proposal/approve", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const { publishToPortal } = req.body as { publishToPortal?: boolean };
  const proposal = await prisma.discoveryProposal.findUnique({ where: { discoveryIntakeId: req.params.id as string } });
  if (!proposal) { res.status(404).json({ error: "No proposal to approve." }); return; }
  const updated = await prisma.discoveryProposal.update({
    where: { id: proposal.id },
    data: {
      status: publishToPortal ? "portal_published" : "approved",
      approvedAt: new Date(),
      ...(publishToPortal ? { portalPublishedAt: new Date() } : {}),
    },
  });
  await audit({
    actorUserId: actor.id, action: "PROPOSAL_APPROVED", entity: "DiscoveryIntake",
    entityId: req.params.id as string, meta: { publishToPortal: !!publishToPortal },
  });
  res.json({ ok: true, proposal: updated });
});

// Admin: export proposal as branded print-ready HTML
router.get("/admin/discovery/:id/proposal.html", withUser, requireAdmin, async (req, res) => {
  const intake = await prisma.discoveryIntake.findUnique({ where: { id: req.params.id as string } });
  const proposal = await prisma.discoveryProposal.findUnique({ where: { discoveryIntakeId: req.params.id as string } });
  if (!intake || !proposal) { res.status(404).send("Proposal not found."); return; }

  const answers: AnsweredQuestion[] = (() => {
    try { return JSON.parse(intake.answers) as AnsweredQuestion[]; } catch { return []; }
  })();
  const milestones: { label: string; description: string }[] = (() => {
    try { return JSON.parse(proposal.milestones) as { label: string; description: string }[]; } catch { return []; }
  })();
  const investment: Record<string, string> = (() => {
    try { return JSON.parse(proposal.investment) as Record<string, string>; } catch { return {}; }
  })();

  const companyName = answers.find((a) => a.id === "company_name")?.answer ?? intake.contactName ?? "Your Company";
  const html = renderProposalHTML({ intake, proposal, milestones, investment, companyName });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ── Proposal generation (Grok) ────────────────────────────────────────────────

interface ProposalContent {
  reviewSummary: string;
  execSummary: string;
  understanding: string;
  scope: string;
  howWeConnect: string;
  milestones: string;
  investment: string;
  acceptanceClause: string;
  tokensUsed: number;
}

async function generateProposalDraft(
  answers: AnsweredQuestion[],
  reportDraft: Record<string, unknown>,
  contactName: string,
): Promise<ProposalContent> {
  const fallback = buildFallbackProposal(answers, reportDraft, contactName);

  const { default: OpenAI } = await import("openai");
  const apiKey = process.env.XAI_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.LLM_API_KEY;
  if (!apiKey) return { ...fallback, tokensUsed: 0 };

  const llm = new OpenAI({ apiKey, baseURL: process.env.LLM_BASE_URL, timeout: 25_000 });
  const qaSummary = answers.slice(0, 20).map((a) => `[${a.category}] ${a.question}\n→ ${a.answer}`).join("\n\n");
  const reportSummary = reportDraft.summary ? `\n\nReport summary: ${reportDraft.summary}` : "";

  const prompt = `Write an ATG Consulting proposal for ${contactName}. Base it on the following intake answers.${reportSummary}

Intake answers:
${qaSummary}

Return ONLY valid JSON:
{
  "reviewSummary": "2-3 sentence internal review note for Shea (not in the client PDF)",
  "execSummary": "2-3 paragraph executive summary for the client",
  "understanding": "Paragraph describing ATG's understanding of the client's situation and challenges",
  "scope": "Bullet-list description of what ATG will build and deliver",
  "howWeConnect": "Brief description of how the workflows connect to the client's existing tools",
  "milestones": "[{\\"label\\": \\"Week 1\\", \\"description\\": \\"...\\"}]",
  "investment": "{\\"tier\\": \\"GUIDED\\", \\"price\\": \\"$997\\", \\"care\\": \\"\\"  , \\"notes\\": \\"\\"}",
  "acceptanceClause": "One sentence acceptance clause for the proposal"
}
Keep it professional, plain English, no invented stats or outcomes.`;

  try {
    const completion = await llm.chat.completions.create({
      model: process.env.AI_MODEL_DEFAULT ?? "grok-3-mini-latest",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2500,
      temperature: 0.5,
      response_format: { type: "json_object" },
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<ProposalContent>;
    return {
      reviewSummary:   raw.reviewSummary   ?? fallback.reviewSummary,
      execSummary:     raw.execSummary     ?? fallback.execSummary,
      understanding:   raw.understanding   ?? fallback.understanding,
      scope:           raw.scope           ?? fallback.scope,
      howWeConnect:    raw.howWeConnect    ?? fallback.howWeConnect,
      milestones:      typeof raw.milestones === "string" ? raw.milestones : JSON.stringify(raw.milestones ?? []),
      investment:      typeof raw.investment === "string" ? raw.investment : JSON.stringify(raw.investment ?? {}),
      acceptanceClause:raw.acceptanceClause ?? fallback.acceptanceClause,
      tokensUsed:      completion.usage?.total_tokens ?? 0,
    };
  } catch {
    return { ...fallback, tokensUsed: 0 };
  }
}

function buildFallbackProposal(answers: AnsweredQuestion[], reportDraft: Record<string, unknown>, contactName: string): Omit<ProposalContent, "tokensUsed"> {
  const company = answers.find((a) => a.id === "company_name")?.answer ?? "your company";
  const problems = answers.find((a) => a.id === "top_problems")?.answer ?? "the challenges discussed";
  const suggestedTier = (reportDraft.suggestedTier as string | undefined) ?? "GUIDED";
  const tierPrices: Record<string, string> = { SELF_SERVE: "$197", GUIDED: "$997", WHITE_GLOVE: "$3,500" };

  return {
    reviewSummary: `Draft proposal for ${contactName} at ${company}. Review and edit before approving.`,
    execSummary: `ATG Consulting is pleased to present this proposal for ${company}. Based on our discovery conversation, we understand that ${problems}. This proposal outlines how we'll address these challenges with a structured, approval-first AI workflow approach.`,
    understanding: `${company} is looking to reduce the time and effort spent on ${problems}. Your team currently handles these manually, and there is a clear opportunity to bring structure, consistency, and efficiency through well-designed AI workflows installed in your own AI platform.`,
    scope: `- Initial assessment and tool plan\n- Setup guides for your chosen AI platform (Grok Bot, Claude, or ChatGPT)\n- ${suggestedTier === "WHITE_GLOVE" ? "Up to 3 custom workflows built and run by Shea" : suggestedTier === "GUIDED" ? "1:1 build sessions with Shea to set up your workflows" : "Ready-made workflows and step-by-step setup guides"}`,
    howWeConnect: `All workflows run inside your own AI platform and connect to the tools you already use — email, calendar, CRM. ATG never accesses your accounts directly; you grant access through your own admin console when needed, and you can revoke it at any time.`,
    milestones: JSON.stringify([
      { label: "Week 1", description: "Discovery complete, tool plan delivered" },
      { label: "Week 2–3", description: "First workflow installed and tested" },
      { label: "Week 4", description: "Review, refine, and plan next steps" },
    ]),
    investment: JSON.stringify({ tier: suggestedTier, price: tierPrices[suggestedTier] ?? "$997", care: suggestedTier === "WHITE_GLOVE" ? "$750/mo optional care plan" : "", notes: "All prices in USD." }),
    acceptanceClause: `By engaging ATG Consulting, you agree to the Terms of Service and Refund Policy at atgconsulting.io/terms and /refunds.`,
  };
}

// ── Proposal HTML renderer ────────────────────────────────────────────────────

function renderProposalHTML(params: {
  intake: { contactEmail: string | null; contactName: string | null };
  proposal: { execSummary: string; understanding: string; scope: string; howWeConnect: string; acceptanceClause: string; approvedAt: Date | null };
  milestones: { label: string; description: string }[];
  investment: Record<string, string>;
  companyName: string;
}): string {
  const { intake, proposal, milestones, investment, companyName } = params;
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const scope = proposal.scope.split("\n").filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ATG Consulting — Proposal for ${companyName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #0A0A0B; --canvas: #FAFAF9; --blue: #3B6BFF;
    --ink2: #1A1A1B; --gray: #6B6B6E; --border: #E5E5E4;
    --font: 'Geist', -apple-system, sans-serif;
    --mono: 'Geist Mono', monospace;
  }
  html { font-family: var(--font); font-size: 14px; line-height: 1.6; color: var(--ink); background: var(--canvas); }
  body { max-width: 780px; margin: 0 auto; padding: 40px 48px; }

  /* Cover page */
  .cover { min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 48px; break-after: page; }
  .logo-mark { font-family: var(--mono); font-size: 24px; font-weight: 700; color: var(--ink); display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border: 2px solid var(--ink); border-radius: 10px; letter-spacing: -0.02em; }
  .logo-text { font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--ink); margin-top: 10px; letter-spacing: 0.04em; }
  .cover-title { font-size: 36px; font-weight: 800; color: var(--ink); letter-spacing: -0.04em; line-height: 1.1; margin-top: auto; }
  .cover-company { font-size: 22px; font-weight: 600; color: var(--blue); margin-top: 10px; }
  .cover-date { font-family: var(--mono); font-size: 12px; color: var(--gray); margin-top: 16px; }
  .cover-tagline { font-size: 14px; color: var(--gray); margin-top: 24px; max-width: 400px; line-height: 1.5; }

  /* Sections */
  .section { margin-top: 56px; }
  .section-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; color: var(--blue); text-transform: uppercase; margin-bottom: 8px; }
  .section-title { font-size: 22px; font-weight: 700; letter-spacing: -0.025em; color: var(--ink); margin-bottom: 16px; }
  p { color: var(--ink); margin-bottom: 12px; font-size: 14px; line-height: 1.7; }
  p:last-child { margin-bottom: 0; }
  ul { list-style: none; padding: 0; }
  ul li { padding: 6px 0 6px 18px; position: relative; color: var(--ink); font-size: 14px; line-height: 1.6; }
  ul li::before { content: '›'; position: absolute; left: 0; color: var(--blue); font-weight: 700; }

  /* Milestones */
  .milestone-grid { display: grid; gap: 12px; margin-top: 8px; }
  .milestone { border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
  .milestone-label { font-family: var(--mono); font-size: 11px; color: var(--blue); letter-spacing: 0.08em; font-weight: 600; margin-bottom: 4px; }
  .milestone-desc { font-size: 13px; color: var(--ink); line-height: 1.5; }

  /* Investment */
  .investment-box { border: 2px solid var(--blue); border-radius: 12px; padding: 24px 28px; margin-top: 16px; }
  .investment-tier { font-family: var(--mono); font-size: 11px; color: var(--blue); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
  .investment-price { font-size: 36px; font-weight: 800; letter-spacing: -0.04em; color: var(--ink); }
  .investment-care { font-size: 13px; color: var(--gray); margin-top: 6px; }
  .investment-notes { font-size: 12px; color: var(--gray); margin-top: 12px; font-family: var(--mono); }

  /* Acceptance */
  .acceptance { margin-top: 64px; border-top: 1px solid var(--border); padding-top: 32px; }
  .sig-line { display: flex; gap: 40px; margin-top: 32px; }
  .sig-field { flex: 1; }
  .sig-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; color: var(--gray); display: block; margin-bottom: 4px; }
  .sig-rule { border-bottom: 1px solid var(--ink); height: 28px; }

  /* Footer */
  .footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .footer-logo { font-family: var(--mono); font-size: 12px; color: var(--gray); }
  .footer-links { font-size: 11px; color: var(--gray); }
  .footer-links a { color: var(--blue); text-decoration: none; margin-left: 12px; }

  /* Print */
  @media print {
    html { font-size: 12px; }
    body { padding: 0; max-width: none; }
    .cover { page-break-after: always; min-height: 100vh; }
    .section { page-break-inside: avoid; }
    .milestone { page-break-inside: avoid; }
    .acceptance { page-break-inside: avoid; }
    @page { margin: 40px 48px; size: A4 portrait; }
  }
</style>
</head>
<body>

<!-- Cover -->
<div class="cover">
  <div>
    <div class="logo-mark">&gt;_</div>
    <div class="logo-text">atg // consulting</div>
  </div>
  <div>
    <div class="cover-title">Proposal</div>
    <div class="cover-company">${companyName}</div>
    <div class="cover-date">Prepared by ATG Consulting · ${date}</div>
    ${intake.contactName ? `<div class="cover-date">For: ${intake.contactName}${intake.contactEmail ? ` · ${intake.contactEmail}` : ""}</div>` : ""}
    <div class="cover-tagline">Software that runs your workflows, plus a person who designs them with you.</div>
  </div>
</div>

<!-- Executive summary -->
<div class="section">
  <div class="section-label">01 — Executive summary</div>
  <div class="section-title">The short version</div>
  ${proposal.execSummary.split("\n\n").filter(Boolean).map((p) => `<p>${p.trim()}</p>`).join("")}
</div>

<!-- Understanding -->
<div class="section">
  <div class="section-label">02 — Our understanding</div>
  <div class="section-title">Where you are today</div>
  ${proposal.understanding.split("\n\n").filter(Boolean).map((p) => `<p>${p.trim()}</p>`).join("")}
</div>

<!-- Scope -->
<div class="section">
  <div class="section-label">03 — What we'll build</div>
  <div class="section-title">Scope of work</div>
  <ul>
    ${scope.map((s) => `<li>${s.replace(/^[-•*]\s*/, "")}</li>`).join("")}
  </ul>
</div>

<!-- How we connect -->
<div class="section">
  <div class="section-label">04 — How it connects</div>
  <div class="section-title">Working inside your existing tools</div>
  ${proposal.howWeConnect.split("\n\n").filter(Boolean).map((p) => `<p>${p.trim()}</p>`).join("")}
</div>

<!-- Milestones -->
${milestones.length > 0 ? `
<div class="section">
  <div class="section-label">05 — Timeline</div>
  <div class="section-title">Key milestones</div>
  <div class="milestone-grid">
    ${milestones.map((m) => `
    <div class="milestone">
      <div class="milestone-label">${m.label}</div>
      <div class="milestone-desc">${m.description}</div>
    </div>`).join("")}
  </div>
</div>` : ""}

<!-- Investment -->
<div class="section">
  <div class="section-label">06 — Investment</div>
  <div class="section-title">What it costs</div>
  <div class="investment-box">
    <div class="investment-tier">${investment.tier ?? "GUIDED"}</div>
    <div class="investment-price">${investment.price ?? "$997"}</div>
    ${investment.care ? `<div class="investment-care">${investment.care}</div>` : ""}
    ${investment.notes ? `<div class="investment-notes">${investment.notes}</div>` : ""}
  </div>
  <p style="margin-top:16px;font-size:12px;color:var(--gray)">
    30-day refund policy applies. See atgconsulting.io/refunds for details.
  </p>
</div>

<!-- Acceptance -->
<div class="acceptance">
  <div class="section-label">07 — Acceptance</div>
  <div class="section-title">Ready to move forward</div>
  <p>${proposal.acceptanceClause}</p>
  <div class="sig-line">
    <div class="sig-field">
      <span class="sig-label">CLIENT SIGNATURE</span>
      <div class="sig-rule"></div>
    </div>
    <div class="sig-field">
      <span class="sig-label">DATE</span>
      <div class="sig-rule"></div>
    </div>
  </div>
  <div class="sig-line" style="margin-top:24px">
    <div class="sig-field">
      <span class="sig-label">PRINT NAME</span>
      <div class="sig-rule"></div>
    </div>
    <div class="sig-field">
      <span class="sig-label">TITLE</span>
      <div class="sig-rule"></div>
    </div>
  </div>
</div>

<!-- Footer -->
<div class="footer">
  <div class="footer-logo">ATG Consulting LTD · CO · USA · shea@atgconsulting.io</div>
  <div class="footer-links">
    <a href="https://atgconsulting.io/terms">Terms</a>
    <a href="https://atgconsulting.io/privacy">Privacy</a>
    <a href="https://atgconsulting.io/refunds">Refunds</a>
  </div>
</div>

</body>
</html>`;
}

export default router;
