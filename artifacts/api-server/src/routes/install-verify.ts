/**
 * Verified install routes.
 *
 * GET  /api/workbench/install-code/:slug
 *   Returns (or generates) a client+slug-unique confirmation code.
 *   The code is included in the SKILL.md first-run instruction:
 *   "On your first run, print this code exactly: ATG-XXXX".
 *   The plain code is returned once here; only its SHA-256 hash is stored.
 *
 * POST /api/workbench/install-verify
 *   Accepts a pasted code, hashes it, and compares to the stored hash.
 *   Rate-limited: max 5 attempts per client+slug per hour.
 *   On success: sets ClientWorkflowSettings.installStatus = "verified".
 *   On failure: increments attempts counter; returns remaining tries.
 *
 * The code format is ATG- followed by 4 uppercase alphanumeric chars
 * (e.g. ATG-7F3K). This is short enough to copy easily, unique enough
 * to prevent guessing (36^4 = ~1.7M combinations, plus rate limiting).
 */

import { Router } from "express";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";

const router = Router();
router.use(withUser, requireAuth);

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
const CODE_LENGTH = 4;
const MAX_ATTEMPTS_PER_HOUR = 5;

function generateCode(): string {
  const buf = randomBytes(CODE_LENGTH);
  return "ATG-" + Array.from(buf).map((b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().trim()).digest("hex");
}

// ── GET /api/workbench/install-code/:slug ────────────────────────────────────

router.get("/workbench/install-code/:slug", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.status(403).json({ error: "No client profile." }); return; }

  const slug = req.params.slug as string;

  // Look up or create the code record
  let record = await prisma.workflowInstallCode.findUnique({
    where: { clientId_slug: { clientId: user.clientId, slug } },
  });

  if (record && record.verified) {
    // Already verified — no need to expose a new code
    res.json({ slug, alreadyVerified: true, code: null });
    return;
  }

  let plainCode: string;
  if (record) {
    // Code exists and not yet verified — we don't re-expose the plain code after the first call.
    // Client must re-install using the SKILL.md (which already contains the code).
    // If they need a fresh code, they can request a reset (future feature).
    res.json({ slug, alreadyVerified: false, code: null, note: "Your verification code is already in your SKILL.md. Paste the code printed by your AI agent on its first run." });
    return;
  }

  // First time — generate a fresh code
  plainCode = generateCode();
  const codeHash = hashCode(plainCode);

  await prisma.workflowInstallCode.create({
    data: { clientId: user.clientId, slug, codeHash },
  });

  res.json({ slug, alreadyVerified: false, code: plainCode, note: "This code appears once. It is included in your SKILL.md first-run instruction." });
});

// ── POST /api/workbench/install-verify ───────────────────────────────────────

const VerifyBody = z.object({
  slug: z.string().min(1).max(80),
  code: z.string().min(1).max(20).transform((s) => s.toUpperCase().trim()),
});

router.post("/workbench/install-verify", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.status(403).json({ error: "No client profile." }); return; }

  const parsed = VerifyBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "slug and code are required." }); return; }

  const { slug, code } = parsed.data;
  const clientId = user.clientId;

  const record = await prisma.workflowInstallCode.findUnique({
    where: { clientId_slug: { clientId, slug } },
  });

  if (!record) {
    res.status(404).json({ error: "No verification code found for this workflow. Generate one by downloading the SKILL.md." });
    return;
  }

  if (record.verified) {
    res.json({ verified: true, message: "This workflow is already verified as installed." });
    return;
  }

  // Rate limit: max 5 attempts per hour
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const attemptedRecently = record.lastAttemptAt && record.lastAttemptAt > hourAgo;
  const attemptsThisHour = attemptedRecently ? record.attempts : 0;

  if (attemptsThisHour >= MAX_ATTEMPTS_PER_HOUR) {
    const resetAt = new Date(record.lastAttemptAt!.getTime() + 60 * 60 * 1000);
    const waitMin = Math.ceil((resetAt.getTime() - now.getTime()) / 60000);
    res.status(429).json({
      error: `Too many incorrect attempts. Try again in ${waitMin} minute${waitMin !== 1 ? "s" : ""}.`,
      attemptsThisHour,
      maxAttempts: MAX_ATTEMPTS_PER_HOUR,
    });
    return;
  }

  const submittedHash = hashCode(code);
  const isValid = submittedHash === record.codeHash;

  if (!isValid) {
    // Track the attempt
    const newAttempts = attemptedRecently ? record.attempts + 1 : 1;
    await prisma.workflowInstallCode.update({
      where: { id: record.id },
      data: { attempts: newAttempts, lastAttemptAt: now },
    });
    const remaining = MAX_ATTEMPTS_PER_HOUR - newAttempts;
    res.status(400).json({
      verified: false,
      error: remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining this hour.`
        : "Too many incorrect attempts. Try again in an hour.",
      remaining,
    });
    return;
  }

  // Valid — mark verified in both the code record and the workflow settings
  const [, settings] = await prisma.$transaction([
    prisma.workflowInstallCode.update({
      where: { id: record.id },
      data: { verified: true, verifiedAt: now, attempts: record.attempts + 1, lastAttemptAt: now },
    }),
    prisma.clientWorkflowSettings.upsert({
      where: { clientId_slug: { clientId, slug } },
      create: { clientId, slug, enabled: true, installStatus: "verified", installedAt: now },
      update: { installStatus: "verified", installedAt: now },
    }),
  ]);

  res.json({
    verified: true,
    installStatus: settings.installStatus,
    installedPlatform: settings.installedPlatform,
    message: "✓ Verified installed! Your workflow is confirmed running in your AI platform.",
  });
});

// ── GET /api/workbench/install-code/:slug/regenerate ─────────────────────────
// Allows a client to reset their code (e.g. if they lost the SKILL.md).
// Only works if not yet verified.

router.post("/workbench/install-code/:slug/regenerate", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.status(403).json({ error: "No client profile." }); return; }

  const slug = req.params.slug as string;
  const clientId = user.clientId;
  const existing = await prisma.workflowInstallCode.findUnique({
    where: { clientId_slug: { clientId, slug } },
  });

  if (existing?.verified) {
    res.status(409).json({ error: "This workflow is already verified — no need to regenerate." });
    return;
  }

  const plainCode = generateCode();
  const codeHash = hashCode(plainCode);

  if (existing) {
    await prisma.workflowInstallCode.update({
      where: { id: existing.id },
      data: { codeHash, attempts: 0, lastAttemptAt: null, verified: false, verifiedAt: null },
    });
  } else {
    await prisma.workflowInstallCode.create({ data: { clientId, slug, codeHash } });
  }

  res.json({ slug, code: plainCode, note: "Re-download your SKILL.md (the new code is embedded in it)." });
});

// ── Admin: client install status ──────────────────────────────────────────────

router.get("/admin/clients/:clientId/install-status", withUser, requireAdmin, async (req, res) => {
  const clientId = req.params.clientId as string;
  const [settings, codes] = await Promise.all([
    prisma.clientWorkflowSettings.findMany({
      where: { clientId },
      select: { slug: true, installedPlatform: true, installedAt: true, installStatus: true },
    }),
    prisma.workflowInstallCode.findMany({
      where: { clientId },
      select: { slug: true, verified: true, verifiedAt: true, attempts: true, createdAt: true },
    }),
  ]);

  const codeMap = Object.fromEntries(codes.map((c) => [c.slug, c]));

  res.json(settings.map((s) => ({
    ...s,
    codeVerified: codeMap[s.slug]?.verified ?? false,
    codeVerifiedAt: codeMap[s.slug]?.verifiedAt ?? null,
    codeAttempts: codeMap[s.slug]?.attempts ?? 0,
  })));
});

export default router;
