/**
 * Session records — admin-only routes.
 * Full transcript is admin-only; clients see only the short recap
 * when shareRecap=true and their tier is GUIDED or WHITE_GLOVE.
 *
 * Admin routes:
 *   POST   /admin/clients/:id/sessions              — create session record
 *   GET    /admin/clients/:id/sessions              — list (newest first)
 *   GET    /admin/clients/:id/sessions/:sid         — get with transcript
 *   PATCH  /admin/clients/:id/sessions/:sid         — update
 *   DELETE /admin/clients/:id/sessions/:sid         — delete
 *   POST   /admin/clients/:id/sessions/:sid/summarize — run LLM summary
 *
 * Client route (Guided/DFY only, shared recaps):
 *   GET    /client/sessions
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { summarizeSession } from "../lib/llm";
import { sanitiseText, sanitiseShortText } from "../lib/sanitize";

const router = Router();

const MAX_TRANSCRIPT_CHARS = 120_000;

// ── Zod schemas ──────────────────────────────────────────────────────────────

const SESSION_TYPES = ["discovery", "guided", "dfy_checkin", "other"] as const;

const SessionCreateSchema = z.object({
  sessionDate:   z.string().min(1),   // ISO date string
  sessionType:   z.enum(SESSION_TYPES),
  sessionNumber: z.number().int().min(1).max(100).optional(),
  recordingUrl:  z.string().url().optional().nullable(),
  consentGiven:  z.boolean().default(false),
  transcript:    z.string().max(MAX_TRANSCRIPT_CHARS).optional(),
  adminNotes:    z.string().max(20_000).optional(),
});

const SessionPatchSchema = z.object({
  sessionDate:   z.string().min(1).optional(),
  sessionType:   z.enum(SESSION_TYPES).optional(),
  sessionNumber: z.number().int().min(1).max(100).optional().nullable(),
  recordingUrl:  z.string().url().optional().nullable(),
  consentGiven:  z.boolean().optional(),
  transcript:    z.string().max(MAX_TRANSCRIPT_CHARS).optional(),
  adminNotes:    z.string().max(20_000).optional(),
  shareRecap:    z.boolean().optional(),
  recapText:     z.string().max(600).optional(),
});

// ── Ownership helper ─────────────────────────────────────────────────────────

async function ownedSession(clientId: string, sessionId: string) {
  return prisma.sessionRecord.findFirst({ where: { id: sessionId, clientId } });
}

// ── Admin: create ─────────────────────────────────────────────────────────────

router.post("/admin/clients/:id/sessions", withUser, requireAdmin, async (req, res) => {
  const clientId = req.params.id as string;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) { res.status(404).json({ error: "Client not found." }); return; }

  const parsed = SessionCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }

  const { sessionDate, sessionType, sessionNumber, recordingUrl, consentGiven, transcript, adminNotes } = parsed.data;

  const session = await prisma.sessionRecord.create({
    data: {
      clientId,
      sessionDate: new Date(sessionDate),
      sessionType,
      sessionNumber: sessionNumber ?? null,
      recordingUrl: recordingUrl ?? null,
      consentGiven,
      transcript: transcript ? sanitiseText(transcript, MAX_TRANSCRIPT_CHARS) : null,
      adminNotes: adminNotes ? sanitiseText(adminNotes, 20_000) : null,
    },
  });
  res.status(201).json(session);
});

// Also accept file upload for transcript (.txt/.vtt/.srt/.md)
router.post("/admin/clients/:id/sessions/:sid/transcript", withUser, requireAdmin, async (req, res) => {
  const session = await ownedSession(req.params.id as string, req.params.sid as string);
  if (!session) { res.status(404).json({ error: "Session not found." }); return; }

  const contentType = req.headers["content-type"] ?? "";
  const allowed = ["text/plain", "text/vtt", "text/x-vtt", "application/octet-stream", "text/markdown", "text/x-markdown"];
  if (!allowed.some((t) => contentType.startsWith(t))) {
    res.status(415).json({ error: "Accepted types: .txt, .vtt, .srt, .md (send as text/plain or text/vtt)." }); return;
  }

  const chunks: Buffer[] = [];
  let size = 0;
  req.on("data", (chunk: Buffer) => {
    size += chunk.length;
    if (size > MAX_TRANSCRIPT_CHARS * 4) { res.status(413).json({ error: "Transcript too large." }); req.destroy(); return; }
    chunks.push(chunk);
  });
  req.on("end", async () => {
    const text = Buffer.concat(chunks).toString("utf-8").slice(0, MAX_TRANSCRIPT_CHARS);
    const updated = await prisma.sessionRecord.update({
      where: { id: session.id },
      data: { transcript: sanitiseText(text, MAX_TRANSCRIPT_CHARS) },
    });
    res.json(updated);
  });
});

// ── Admin: list ───────────────────────────────────────────────────────────────

router.get("/admin/clients/:id/sessions", withUser, requireAdmin, async (req, res) => {
  const sessions = await prisma.sessionRecord.findMany({
    where: { clientId: req.params.id as string },
    orderBy: { sessionDate: "desc" },
    select: {
      id: true, clientId: true, sessionDate: true, sessionType: true,
      sessionNumber: true, recordingUrl: true, consentGiven: true,
      shareRecap: true, recapText: true, summarySource: true,
      adminNotes: true, createdAt: true, updatedAt: true,
      // Exclude full transcript from list view for performance
      summaryJson: true,
    },
  });
  res.json(sessions);
});

// ── Admin: get (with transcript) ──────────────────────────────────────────────

router.get("/admin/clients/:id/sessions/:sid", withUser, requireAdmin, async (req, res) => {
  const session = await ownedSession(req.params.id as string, req.params.sid as string);
  if (!session) { res.status(404).json({ error: "Not found." }); return; }
  res.json(session);
});

// ── Admin: update ─────────────────────────────────────────────────────────────

router.patch("/admin/clients/:id/sessions/:sid", withUser, requireAdmin, async (req, res) => {
  const session = await ownedSession(req.params.id as string, req.params.sid as string);
  if (!session) { res.status(404).json({ error: "Not found." }); return; }

  const parsed = SessionPatchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }

  const data = {
    ...parsed.data,
    sessionDate: parsed.data.sessionDate ? new Date(parsed.data.sessionDate) : undefined,
    transcript: parsed.data.transcript ? sanitiseText(parsed.data.transcript, MAX_TRANSCRIPT_CHARS) : undefined,
    adminNotes: parsed.data.adminNotes ? sanitiseText(parsed.data.adminNotes, 20_000) : undefined,
  };

  const updated = await prisma.sessionRecord.update({ where: { id: session.id }, data });
  res.json(updated);
});

// ── Admin: delete ─────────────────────────────────────────────────────────────

router.delete("/admin/clients/:id/sessions/:sid", withUser, requireAdmin, async (req, res) => {
  const session = await ownedSession(req.params.id as string, req.params.sid as string);
  if (!session) { res.status(404).json({ error: "Not found." }); return; }
  await prisma.sessionRecord.delete({ where: { id: session.id } });
  res.json({ ok: true });
});

// ── Admin: summarize ──────────────────────────────────────────────────────────

router.post("/admin/clients/:id/sessions/:sid/summarize", withUser, requireAdmin, async (req, res) => {
  const session = await ownedSession(req.params.id as string, req.params.sid as string);
  if (!session) { res.status(404).json({ error: "Not found." }); return; }
  if (!session.transcript) { res.status(422).json({ error: "No transcript to summarise. Add a transcript first." }); return; }

  const summary = await summarizeSession(
    session.transcript,
    session.sessionType,
    session.sessionNumber ?? undefined
  );

  const updated = await prisma.sessionRecord.update({
    where: { id: session.id },
    data: {
      summaryJson: JSON.stringify(summary),
      summarySource: summary.source,
      recapText: summary.shortRecap,
    },
  });
  res.json({ session: updated, summary });
});

// ── Client: shared recaps (Guided/DFY only) ───────────────────────────────────

router.get("/client/sessions", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser;
  if (!user?.clientId) { res.status(404).json({ error: "No client profile." }); return; }

  const client = await prisma.client.findUnique({ where: { id: user.clientId }, select: { tier: true } });
  const allowedTiers = ["GUIDED", "WHITE_GLOVE"];
  if (!client || !allowedTiers.includes(client.tier)) {
    res.json([]); return; // Self-serve/NONE see no session recaps
  }

  const sessions = await prisma.sessionRecord.findMany({
    where: { clientId: user.clientId, shareRecap: true },
    orderBy: { sessionDate: "desc" },
    select: {
      id: true, sessionDate: true, sessionType: true, sessionNumber: true,
      recapText: true, recordingUrl: true, createdAt: true,
      // Full transcript never sent to client
    },
  });
  res.json(sessions);
});

export default router;
