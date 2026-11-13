/**
 * ATG service notifications and explicitly approved assessment delivery.
 *
 * EMAIL_PROVIDER=console (default) | resend | postmark | smtp
 * SHEA_EMAIL defaults to shea@atgconsulting.io.
 *
 * Prospect reports are sent only from the admin's explicit delivery action.
 * This never sends client outreach or reads a customer's inbox. Login stays with Clerk.
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

/** ATG's own reviewed deliverable, not an automation acting as the customer. */
export async function sendAssessmentReport(to: string, text: string): Promise<EmailResult> {
  const transport = await getTransport();
  if (!transport) return { sent: false, error: "Configure EMAIL_PROVIDER and its credentials in Replit before emailing reports." };
  try {
    await transport.sendMail({ from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`, to, subject: "Your reviewed ATG assessment", text });
    return { sent: true };
  } catch {
    return { sent: false, error: "The email provider did not confirm delivery. Check its logs before retrying." };
  }
}
