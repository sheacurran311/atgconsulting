// POST /api/intake
// Receives the intake form, validates, rate-limits, stores, calls LLM, optionally emails.

import { Router } from "express";
import { SubmitIntakeBody as IntakeSchema } from "@workspace/api-zod";
import { createHash } from "crypto";
import { prisma } from "../lib/db";
import { checkRateLimit } from "../lib/rateLimit";
import { sanitiseShortText, sanitiseText } from "../lib/sanitize";
import { generateTailoredResponse } from "../lib/llm";
import { sendResponseEmail } from "../lib/email";

// ── Helper: hash IP for logging without storing cleartext ────────────────────

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip + (process.env.IP_HASH_SALT ?? "atg")).digest("hex").slice(0, 16);
}

// ── Route handler ─────────────────────────────────────────────────────────────

const router = Router();
router.post("/intake", async (req, res) => {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return res.status(429).json({ error: "Too many submissions. Please try again in 15 minutes." });
  }

  // ── Parse & validate body ────────────────────────────────────────────────
  let body: unknown;
  try {
    body = req.body;
  } catch {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() });
  }

  const data = parsed.data;

  // ── Honeypot check ───────────────────────────────────────────────────────
  if (data.honeypot && data.honeypot.length > 0) {
    // Silently accept but don't process (bot trap)
    return res.json({ ok: true });
  }

  // ── Sanitise free-text fields ────────────────────────────────────────────
  const safeData = {
    ...data,
    name: sanitiseShortText(data.name),
    role: sanitiseShortText(data.role),
    industry: sanitiseShortText(data.industry),
    automateFirst: data.automateFirst ? sanitiseShortText(data.automateFirst) : undefined,
    freeText: data.freeText ? sanitiseText(data.freeText) : undefined,
  };

  // ── Store submission ─────────────────────────────────────────────────────
  const submission = await prisma.intakeSubmission.create({
    data: {
      name: safeData.name,
      email: safeData.email,
      role: safeData.role,
      industry: safeData.industry,
      bizSize: safeData.bizSize,
      areas: JSON.stringify(safeData.areas),
      aiComfort: safeData.aiComfort,
      tools: JSON.stringify(safeData.tools),
      timeSinks: JSON.stringify(safeData.timeSinks),
      automateFirst: safeData.automateFirst,
      hoursLost: safeData.hoursLost,
      preferredHelp: safeData.preferredHelp,
      freeText: safeData.freeText,
      honeypot: safeData.honeypot,
      ipHash: hashIp(ip),
    },
  });

  // ── Generate tailored response ───────────────────────────────────────────
  const response = await generateTailoredResponse(safeData);

  // ── Persist the response back to the record ──────────────────────────────
  await prisma.intakeSubmission.update({
    where: { id: submission.id },
    data: {
      llmResponse: JSON.stringify(response),
      responseType: response.type,
    },
  });

  // ── Optionally send email ────────────────────────────────────────────────
  const emailResult = await sendResponseEmail(safeData, response);
  if (emailResult.sent) {
    await prisma.intakeSubmission.update({
      where: { id: submission.id },
      data: { emailSent: true },
    });
  }

  return res.json({ ok: true, response });
});

export default router;
