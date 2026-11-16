/**
 * Sources and summaries are private. recapText is the published snapshot;
 * summaryJson.shortRecap is the editable draft. Generation never publishes.
 */
import { Router, type RequestHandler, type Request, type Response } from "express";
import { z } from "zod";
import type { Prisma, SessionRecord } from "@prisma/client";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { summarizeSession } from "../lib/llm";
import { applyGuidedCount, releaseGuidedCount } from "../lib/guidedCount";
import { sanitiseMultilineText } from "../lib/sanitize";

const MAX_TRANSCRIPT_CHARS = 120_000;
const DateText = z.string().max(40).refine((s) => Number.isFinite(Date.parse(s)), "Enter a valid session date.");
const Version = z.string().datetime({ offset: true });
const SessionCreateSchema = z.object({
  sessionDate: DateText, sessionType: z.enum(["discovery", "guided", "dfy_checkin", "other"]),
  sessionNumber: z.number().int().min(1).max(100).optional(),
  recordingUrl: z.string().url().optional().nullable(), consentGiven: z.boolean().default(false),
  transcript: z.string().max(MAX_TRANSCRIPT_CHARS).optional(), adminNotes: z.string().max(20_000).optional(),
}).strict();
const SessionPatchSchema = SessionCreateSchema.partial().extend({
  expectedUpdatedAt: Version,
  sessionNumber: z.number().int().min(1).max(100).nullable().optional(),
  shareRecap: z.literal(false).optional(), // Publishing requires the reviewed-draft endpoint.
}).strict();
const RecapDraftSchema = z.object({ expectedUpdatedAt: Version, recapText: z.string().trim().min(1).max(600) }).strict();
const VersionBody = z.object({ expectedUpdatedAt: Version }).strict();

function summaryObject(raw: string | null): Record<string, unknown> {
  try { const v: unknown = JSON.parse(raw ?? "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}; }
  catch { return {}; }
}
async function ownedSession(clientId: string, sessionId: string) {
  return prisma.sessionRecord.findFirst({ where: { id: sessionId, clientId } });
}
async function checkedSession(req: Request, res: Response, expected: string) {
  const session = await ownedSession(req.params.id as string, req.params.sid as string);
  if (!session) { res.status(404).json({ error: "Session not found." }); return null; }
  if (session.updatedAt.getTime() !== new Date(expected).getTime()) {
    res.status(409).json({ error: "This session changed. Reload the saved version before saving or publishing. Your unsaved text is still in the editor." }); return null;
  }
  return session;
}
async function writeSession(session: SessionRecord, data: Prisma.SessionRecordUpdateManyMutationInput, res: Response) {
  const result = await prisma.sessionRecord.updateMany({
    where: { id: session.id, clientId: session.clientId, updatedAt: session.updatedAt },
    // Advance even when two saves happen within the same millisecond.
    data: { ...data, updatedAt: new Date(Math.max(Date.now(), session.updatedAt.getTime() + 1)) },
  });
  if (!result.count) { res.status(409).json({ error: "This session changed while processing. Reload before retrying; the saved version was preserved." }); return null; }
  const updated = await prisma.sessionRecord.findUnique({ where: { id: session.id } });
  if (!updated) { res.status(404).json({ error: "Session not found." }); return null; }
  return updated;
}

export function createSessionsRouter(resolve: RequestHandler = withUser) {
  const router = Router();
  router.post("/admin/clients/:id/sessions", resolve, requireAdmin, async (req, res) => {
    const clientId = req.params.id as string;
    if (!await prisma.client.findUnique({ where: { id: clientId } })) { res.status(404).json({ error: "Client not found." }); return; }
    const parsed = SessionCreateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(422).json({ error: "Check the date and session fields. Your source has not been saved.", issues: parsed.error.flatten() }); return; }
    const { sessionDate, sessionType, sessionNumber, recordingUrl, consentGiven, transcript, adminNotes } = parsed.data;
    const session = await prisma.sessionRecord.create({ data: {
      clientId, sessionDate: new Date(sessionDate), sessionType, sessionNumber: sessionNumber ?? null,
      recordingUrl: recordingUrl ?? null, consentGiven,
      transcript: transcript ? sanitiseMultilineText(transcript, MAX_TRANSCRIPT_CHARS) : null,
      adminNotes: adminNotes ? sanitiseMultilineText(adminNotes, 20_000) : null,
    } });
    await applyGuidedCount({ clientId, kind: "session", recordId: session.id, when: session.sessionDate, counts: session.sessionType === "guided", alreadyCounted: false });
    const saved = await prisma.sessionRecord.findUnique({ where: { id: session.id } });
    res.status(201).json(saved ?? session);
  });
  router.get("/admin/clients/:id/sessions", resolve, requireAdmin, async (req, res) => {
    const sessions = await prisma.sessionRecord.findMany({
      where: { clientId: req.params.id as string }, orderBy: { sessionDate: "desc" },
      select: { id: true, clientId: true, sessionDate: true, sessionType: true, sessionNumber: true, recordingUrl: true,
        consentGiven: true, shareRecap: true, recapText: true, summarySource: true, adminNotes: true,
        createdAt: true, updatedAt: true, summaryJson: true },
    });
    res.json(sessions);
  });
  router.get("/admin/clients/:id/sessions/:sid", resolve, requireAdmin, async (req, res) => {
    const session = await ownedSession(req.params.id as string, req.params.sid as string);
    if (!session) { res.status(404).json({ error: "Session not found." }); return; }
    res.json(session);
  });
  router.patch("/admin/clients/:id/sessions/:sid", resolve, requireAdmin, async (req, res) => {
    const parsed = SessionPatchSchema.safeParse(req.body);
    if (!parsed.success) { res.status(422).json({ error: "A current saved version is required. Use Save recap draft and Publish reviewed recap to share text.", issues: parsed.error.flatten() }); return; }
    const session = await checkedSession(req, res, parsed.data.expectedUpdatedAt);
    if (!session) return;
    const { expectedUpdatedAt: _version, ...fields } = parsed.data;
    if (session.shareRecap && fields.shareRecap !== false && fields.recordingUrl !== undefined && fields.recordingUrl !== session.recordingUrl) {
      res.status(409).json({ error: "Unshare the recap before changing its recording link, then review and publish it again." }); return;
    }
    const updated = await writeSession(session, {
      ...fields,
      ...(fields.sessionDate !== undefined ? { sessionDate: new Date(fields.sessionDate) } : {}),
      ...(fields.transcript !== undefined ? { transcript: sanitiseMultilineText(fields.transcript, MAX_TRANSCRIPT_CHARS) } : {}),
      ...(fields.adminNotes !== undefined ? { adminNotes: sanitiseMultilineText(fields.adminNotes, 20_000) } : {}),
    }, res);
    if (!updated) return;
    if (fields.sessionDate !== undefined || fields.sessionType !== undefined) {
      await applyGuidedCount({ clientId: updated.clientId, kind: "session", recordId: updated.id, when: updated.sessionDate, counts: updated.sessionType === "guided", alreadyCounted: session.packageCounted });
    }
    res.json(updated);
  });
  router.post("/admin/clients/:id/sessions/:sid/transcript", resolve, requireAdmin, async (req, res, next) => {
    const version = Version.safeParse(req.headers["x-session-version"]);
    if (!version.success) { res.status(422).json({ error: "Send the current session updatedAt in x-session-version." }); return; }
    const session = await checkedSession(req, res, version.data);
    if (!session) return;
    const type = req.headers["content-type"] ?? "";
    if (!["text/plain", "text/vtt", "text/x-vtt", "application/octet-stream", "text/markdown", "text/x-markdown"].some((t) => type.startsWith(t))) {
      res.status(415).json({ error: "Accepted transcript types: .txt, .vtt, .srt, .md." }); return;
    }
    const chunks: Buffer[] = []; let size = 0;
    req.on("data", (chunk: Buffer) => { size += chunk.length; if (size <= MAX_TRANSCRIPT_CHARS * 4) chunks.push(chunk); });
    req.on("error", next);
    req.on("end", () => {
      if (size > MAX_TRANSCRIPT_CHARS * 4) { res.status(413).json({ error: "Transcript too large." }); return; }
      const text = Buffer.concat(chunks).toString("utf8");
      if (text.length > MAX_TRANSCRIPT_CHARS) { res.status(413).json({ error: "Transcript exceeds 120,000 characters." }); return; }
      void writeSession(session, { transcript: sanitiseMultilineText(text, MAX_TRANSCRIPT_CHARS) }, res)
        .then((updated) => { if (updated) res.json(updated); }).catch(next);
    });
  });
  router.post("/admin/clients/:id/sessions/:sid/summarize", resolve, requireAdmin, async (req, res) => {
    const body = VersionBody.safeParse(req.body);
    if (!body.success) { res.status(422).json({ error: "Reload the current session before summarizing." }); return; }
    const session = await checkedSession(req, res, body.data.expectedUpdatedAt);
    if (!session) return;
    if (!session.consentGiven) { res.status(422).json({ error: "Confirm the customer's authorization to process this transcript before summarizing. Private operator notes can be retained without AI processing." }); return; }
    if (!session.transcript?.trim()) { res.status(422).json({ error: "No transcript to summarize. Add an authorized source first." }); return; }
    const summary = await summarizeSession(session.transcript, session.sessionType, session.sessionNumber ?? undefined);
    const warning = session.transcript.length > 20_000 ? "Source exceeds 20,000 characters. AI summaries use only the first 20,000 characters; review the full source before publishing a recap." : null;
    const updated = await writeSession(session, { summaryJson: JSON.stringify({ ...summary, sourceWarning: warning }), summarySource: summary.source }, res);
    if (!updated) return;
    res.json({ session: updated, summary, warning });
  });
  router.put("/admin/clients/:id/sessions/:sid/recap-draft", resolve, requireAdmin, async (req, res) => {
    const body = RecapDraftSchema.safeParse(req.body);
    if (!body.success) { res.status(422).json({ error: "Enter a recap of 1–600 characters and provide the saved version." }); return; }
    const session = await checkedSession(req, res, body.data.expectedUpdatedAt);
    if (!session) return;
    const summary = summaryObject(session.summaryJson);
    const updated = await writeSession(session, { summaryJson: JSON.stringify({ ...summary, shortRecap: body.data.recapText, source: summary.source ?? "MANUAL" }), summarySource: session.summarySource ?? "MANUAL" }, res);
    if (updated) res.json(updated);
  });
  router.post("/admin/clients/:id/sessions/:sid/recap/publish", resolve, requireAdmin, async (req, res) => {
    const body = VersionBody.safeParse(req.body);
    if (!body.success) { res.status(422).json({ error: "Save and review the current recap draft before publishing." }); return; }
    const session = await checkedSession(req, res, body.data.expectedUpdatedAt);
    if (!session) return;
    const recap = z.string().trim().min(1).max(600).safeParse(summaryObject(session.summaryJson).shortRecap);
    if (!recap.success) { res.status(422).json({ error: "Save a reviewed recap draft before publishing." }); return; }
    if ((session.transcript || session.recordingUrl) && !session.consentGiven) {
      res.status(422).json({ error: "Confirm the customer's authorization for the attached source before publishing." }); return;
    }
    const updated = await writeSession(session, { recapText: recap.data, shareRecap: true }, res);
    if (updated) res.json(updated);
  });
  router.delete("/admin/clients/:id/sessions/:sid", resolve, requireAdmin, async (req, res) => {
    const session = await ownedSession(req.params.id as string, req.params.sid as string);
    if (!session) { res.status(404).json({ error: "Session not found." }); return; }
    await prisma.sessionRecord.delete({ where: { id: session.id } });
    await releaseGuidedCount({ clientId: session.clientId, when: session.sessionDate, wasCounted: session.packageCounted && session.sessionType === "guided" });
    res.json({ ok: true });
  });
  router.get("/client/sessions", resolve, requireAuth, async (req, res) => {
    const clientId = (req as AuthedRequest).atgUser?.clientId;
    if (!clientId) { res.status(404).json({ error: "No client profile." }); return; }
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { tier: true } });
    if (!client || !["GUIDED", "WHITE_GLOVE"].includes(client.tier)) { res.json([]); return; }
    const sessions = await prisma.sessionRecord.findMany({ where: { clientId, shareRecap: true }, orderBy: { sessionDate: "desc" },
      select: { id: true, sessionDate: true, sessionType: true, sessionNumber: true, recapText: true, recordingUrl: true, consentGiven: true, createdAt: true } });
    res.json(sessions.map((s) => ({
      id: s.id, sessionDate: s.sessionDate, sessionType: s.sessionType, sessionNumber: s.sessionNumber,
      recapText: s.recapText, recordingUrl: s.consentGiven ? s.recordingUrl : null, createdAt: s.createdAt,
    })));
  });
  return router;
}
export default createSessionsRouter();
