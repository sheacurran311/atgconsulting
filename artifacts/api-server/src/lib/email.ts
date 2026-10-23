// Pluggable email sender – off by default.
// Set EMAIL_ENABLED=true and configure SMTP_* env vars to activate.
// Currently uses Nodemailer, which works with any SMTP provider (SendGrid, Gmail, Mailgun, Resend, etc.)

import type { IntakeFormData, TailoredResponse } from "../types/intake";
import { AREA_LABELS } from "../types/intake";
import { logger } from "./logger";

interface EmailResult {
  sent: boolean;
  error?: string;
}

function formatResponseAsText(response: TailoredResponse): string {
  const lines: string[] = [];
  lines.push(`YOUR AI LEVEL\n${response.aiLevelSummary}\n`);
  lines.push("STARTER WORKFLOWS");
  for (const w of response.workflows) {
    lines.push(`• ${AREA_LABELS[w.area]}: ${w.title}\n  ${w.description}`);
  }
  lines.push(`\nQUICK WIN THIS WEEK\n${response.quickWin}`);
  lines.push(`\nRECOMMENDED TIER\n${response.tierRationale}`);
  lines.push(`\n${response.ctaText}`);
  return lines.join("\n");
}

export async function sendResponseEmail(
  data: IntakeFormData,
  response: TailoredResponse
): Promise<EmailResult> {
  if (process.env.EMAIL_ENABLED !== "true") return { sent: false };

  try {
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const body = formatResponseAsText(response);
    const fromName = process.env.EMAIL_FROM_NAME ?? "Shea at ATG Consulting";
    const fromAddr = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "";
    const sheaEmail = process.env.SHEA_EMAIL ?? fromAddr;

    // Email to the prospect
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: data.email,
      subject: "Your personalised AI workflow recommendations — ATG Consulting",
      text: `Hi ${data.name.split(" ")[0]},\n\nHere are your personalised recommendations:\n\n${body}\n\n— Shea\nATG Consulting | atgconsulting.io`,
    });

    // Blind-copy Shea on every submission
    if (sheaEmail && sheaEmail !== data.email) {
      await transporter.sendMail({
        from: `"${fromName}" <${fromAddr}>`,
        to: sheaEmail,
        subject: `New intake from ${data.name} (${data.role}, ${data.industry})`,
        text: `Name: ${data.name}\nEmail: ${data.email}\nRole: ${data.role}\nIndustry: ${data.industry}\n\n${body}`,
      });
    }

    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: msg }, "Email delivery failed");
    return { sent: false, error: msg };
  }
}
