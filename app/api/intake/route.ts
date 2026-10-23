// POST /api/intake
// Receives the intake form, validates, rate-limits, stores, calls LLM, optionally emails.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { sanitiseShortText, sanitiseText } from "@/lib/sanitize";
import { generateTailoredResponse } from "@/lib/llm";
import { sendResponseEmail } from "@/lib/email";

// ── Zod validation schema ────────────────────────────────────────────────────

const AREAS = ["executive_assistant", "marketing", "sales", "customer_support"] as const;
const TOOLS = ["chatgpt", "claude", "gemini", "grok", "copilot", "zapier_make", "crm", "none", "other"] as const;
const TIME_SINKS = [
  "email", "prospecting", "followups", "research", "proposals",
  "scheduling", "social_content", "admin", "personal_logistics",
] as const;
const BIZ_SIZES = ["solo", "2-10", "11-50", "50+"] as const;
const PREFERRED_HELP = ["self_serve", "guided", "done_for_you", "not_sure"] as const;

const IntakeSchema = z.object({
  // Step 1
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  role: z.string().min(1).max(100),
  industry: z.string().min(1).max(100),
  bizSize: z.enum(BIZ_SIZES),
  areas: z.array(z.enum(AREAS)).min(1).max(4),
  // Step 2
  aiComfort: z.number().int().min(0).max(4),
  tools: z.array(z.enum(TOOLS)).min(1),
  timeSinks: z.array(z.enum(TIME_SINKS)).min(1),
  automateFirst: z.string().max(120).optional(),
  // Step 3
  hoursLost: z.number().int().min(1).max(40),
  preferredHelp: z.enum(PREFERRED_HELP),
  freeText: z.string().max(280).optional(),
  // Anti-spam honeypot (bots fill this; humans leave it blank)
  honeypot: z.string().default(""),
});

// ── Helper: hash IP for logging without storing cleartext ────────────────────

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip + (process.env.IP_HASH_SALT ?? "atg")).digest("hex").slice(0, 16);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again in 15 minutes." },
      { status: 429 }
    );
  }

  // ── Parse & validate body ────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // ── Honeypot check ───────────────────────────────────────────────────────
  if (data.honeypot && data.honeypot.length > 0) {
    // Silently accept but don't process (bot trap)
    return NextResponse.json({ ok: true });
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

  return NextResponse.json({ ok: true, response });
}
