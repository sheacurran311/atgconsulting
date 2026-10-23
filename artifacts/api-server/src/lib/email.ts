/**
 * Email provider — pluggable, off by default.
 * EMAIL_PROVIDER=console (default) | resend | postmark | smtp
 *
 * Login emails are handled by Clerk. This sends:
 *  - New intake alert to Shea (EMAIL_SEND_INTAKE_ALERTS=true)
 *  - Daily digest to client (EMAIL_SEND_DIGESTS=true)
 *  - Plan PDF to client (EMAIL_SEND_PLANS=true)
 *
 * contact / from: shea@atgconsulting.io (configurable via EMAIL_FROM)
 */

const EMAIL_FROM = process.env.EMAIL_FROM ?? "shea@atgconsulting.io";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME ?? "Shea at ATG Consulting";
const SHEA_EMAIL = process.env.SHEA_EMAIL ?? "shea@atgconsulting.io";
const APP_URL = process.env.APP_URL ?? "https://atgconsulting.io";

interface EmailResult { sent: boolean; error?: string }

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

async function send(to: string, subject: string, text: string): Promise<EmailResult> {
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

export async function sendIntakeNotification(intake: { name: string; email: string; role: string; industry: string; hoursLost: number }, intakeId: string): Promise<EmailResult> {
  return send(
    SHEA_EMAIL,
    `New intake from ${intake.name} (${intake.role}, ${intake.industry})`,
    `New intake submitted.\n\nName: ${intake.name}\nEmail: ${intake.email}\nRole: ${intake.role}\nIndustry: ${intake.industry}\nHours/week lost: ${intake.hoursLost}\n\nView pre-call report:\n${APP_URL}/admin/clients — search for ${intake.email}\n\nIntake ID: ${intakeId}`,
  );
}

export async function sendDigestEmail(clientEmail: string, clientName: string, contentMarkdown: string, date: string): Promise<EmailResult> {
  return send(
    clientEmail,
    `Your daily digest — ${date} | ATG Consulting`,
    `Hi ${clientName.split(" ")[0]},\n\n${contentMarkdown.replace(/[#*`]/g, "")}\n\n— Shea\nATG Consulting | ${APP_URL}`,
  );
}
