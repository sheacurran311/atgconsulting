/**
 * Notifications to Shea only.
 *
 * EMAIL_PROVIDER=console (default) | resend | postmark | smtp
 * SHEA_EMAIL defaults to shea@atgconsulting.io.
 *
 * This module never addresses a client, teammate, or approver.
 * Login mail stays with Clerk. Digests are not emailed.
 */

const EMAIL_FROM = process.env.EMAIL_FROM ?? "shea@atgconsulting.io";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME ?? "Shea at ATG Consulting";

interface EmailResult { sent: boolean; error?: string }

export function sheaInbox(): string {
  return process.env.SHEA_EMAIL ?? "shea@atgconsulting.io";
}

async function getTransport() {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  if (provider === "console") return null;

  if (provider === "smtp" || provider === "resend" || provider === "postmark") {
    const nm = await import("nodemailer");
    if (provider === "resend") {
      return nm.default.createTransport({ host: "smtp.resend.com", port: 465, secure: true, auth: { user: "resend", pass: process.env.RESEND_API_KEY } });
    }
    if (provider === "postmark") {
      return nm.default.createTransport({ host: "smtp.postmarkapp.com", port: 587, auth: { user: process.env.POSTMARK_TOKEN, pass: process.env.POSTMARK_TOKEN } });
    }
    return nm.default.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  }
  return null;
}

/** Send one message to Shea's inbox. The `to` address is not a parameter. */
export async function notifyShea(subject: string, text: string): Promise<EmailResult> {
  const to = sheaInbox();
  const transport = await getTransport();
  if (!transport) {
    console.log(`[email:console] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return { sent: false };
  }
  try {
    await transport.sendMail({ from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`, to, subject, text });
    return { sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] Failed:", msg);
    return { sent: false, error: msg };
  }
}
