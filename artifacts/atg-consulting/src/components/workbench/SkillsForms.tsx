/**
 * Phase 1 Workbench skill forms — four self-serve workflows.
 * Each form collects inputs, calls the API, and returns an OutputItem
 * for Today to show under Reminders.
 * Client approval is always required; nothing is sent automatically.
 */
import { useState } from "react";
import { skillsApi, type OutputItem } from "@/lib/api";

type SkillKey = "inbox-triage" | "review-request" | "social-calendar" | "seo-audit";

interface Props {
  skillKey: SkillKey;
  onOutput: (item: OutputItem) => void;
  onClose: () => void;
}

// ── Shared field ─────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: "var(--canvas-text)" }}>{label}</label>
      {hint && <p className="text-xs mb-1.5" style={{ color: "var(--canvas-text-3)" }}>{hint}</p>}
      {children}
    </div>
  );
}

// ── 1. Inbox triage ───────────────────────────────────────────────────────────

function InboxTriageForm({ onOutput, onClose }: Omit<Props, "skillKey">) {
  const [messages, setMessages] = useState("");
  const [bizDesc, setBizDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!messages.trim()) { setError("Paste at least one message."); return; }
    setLoading(true); setError(null);
    try {
      const { output } = await skillsApi.inboxTriage({ messages, businessDescription: bizDesc || undefined });
      onOutput(output);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>INBOX TRIAGE</p>
        <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Classify messages and draft replies</h3>
        <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>Paste inbound messages. Each one gets a classification and a draft reply for you to review and copy.</p>
      </div>
      <Field label="Messages" hint="Paste one message per line, or separate with ---">
        <textarea value={messages} onChange={(e) => setMessages(e.target.value)} rows={6} maxLength={8000}
          className="field-input resize-none text-sm" placeholder="Customer: Do you offer weekend appointments?&#10;Review response needed: 1-star review posted today…" />
      </Field>
      <Field label="Business description" hint="Optional: helps tailor the drafts">
        <input value={bizDesc} onChange={(e) => setBizDesc(e.target.value)} maxLength={300}
          className="field-input text-sm" placeholder="e.g. Plumbing company serving Denver" />
      </Field>
      <FormActions onClose={onClose} onSubmit={submit} loading={loading} error={error} />
    </div>
  );
}

// ── 2. Review requests + replies ──────────────────────────────────────────────

function ReviewRequestForm({ onOutput, onClose }: Omit<Props, "skillKey">) {
  const [f, setF] = useState({ businessName: "", businessType: "", channels: "SMS, Email", reviews: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!f.businessName || !f.businessType) { setError("Business name and type are required."); return; }
    setLoading(true); setError(null);
    try {
      const { output } = await skillsApi.reviewRequest({ ...f, reviews: f.reviews || undefined });
      onOutput(output);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>REVIEW REQUESTS</p>
        <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Review request messages + reply drafts</h3>
        <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>Get short review request messages for each channel, and paste in reviews to get reply drafts.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Business name"><input value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} maxLength={100} className="field-input text-sm" placeholder="Sunny Plumbing" /></Field>
        <Field label="Business type"><input value={f.businessType} onChange={(e) => setF({ ...f, businessType: e.target.value })} maxLength={100} className="field-input text-sm" placeholder="Plumbing contractor" /></Field>
      </div>
      <Field label="Channels for review requests" hint="e.g. SMS, Email, in-person script">
        <input value={f.channels} onChange={(e) => setF({ ...f, channels: e.target.value })} maxLength={200} className="field-input text-sm" />
      </Field>
      <Field label="Reviews to reply to" hint="Optional: paste one or more reviews">
        <textarea value={f.reviews} onChange={(e) => setF({ ...f, reviews: e.target.value })} rows={4} maxLength={5000}
          className="field-input resize-none text-sm" placeholder="★★★★★ Great service, very professional…" />
      </Field>
      <FormActions onClose={onClose} onSubmit={submit} loading={loading} error={error} />
    </div>
  );
}

// ── 3. Social content calendar ─────────────────────────────────────────────────

function SocialCalendarForm({ onOutput, onClose }: Omit<Props, "skillKey">) {
  const [f, setF] = useState({ businessDescription: "", offers: "", platforms: "Instagram, Facebook", cadence: 3, weeks: 2 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!f.businessDescription || !f.platforms) { setError("Business description and platforms are required."); return; }
    setLoading(true); setError(null);
    try {
      const { output } = await skillsApi.socialCalendar({ ...f });
      onOutput(output);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>SOCIAL CALENDAR</p>
        <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Content calendar + post drafts</h3>
        <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>Generates a content calendar and draft posts. You review and copy each post before publishing.</p>
      </div>
      <Field label="Business description" hint="What you do, who you serve"><textarea value={f.businessDescription} onChange={(e) => setF({ ...f, businessDescription: e.target.value })} rows={3} maxLength={400} className="field-input resize-none text-sm" placeholder="Coffee shop in Denver specialising in single-origin pour-overs" /></Field>
      <Field label="Current offers or news" hint="Optional: promos, events, seasonal items"><input value={f.offers} onChange={(e) => setF({ ...f, offers: e.target.value })} maxLength={500} className="field-input text-sm" placeholder="Summer cold brew special, $1 off through July" /></Field>
      <Field label="Platforms"><input value={f.platforms} onChange={(e) => setF({ ...f, platforms: e.target.value })} maxLength={200} className="field-input text-sm" /></Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Posts per week per platform">
          <input type="number" min={1} max={7} value={f.cadence} onChange={(e) => setF({ ...f, cadence: +e.target.value })} className="field-input text-sm" />
        </Field>
        <Field label="Weeks to plan">
          <input type="number" min={1} max={4} value={f.weeks} onChange={(e) => setF({ ...f, weeks: +e.target.value })} className="field-input text-sm" />
        </Field>
      </div>
      <FormActions onClose={onClose} onSubmit={submit} loading={loading} error={error} />
    </div>
  );
}

// ── 4. Local SEO audit ─────────────────────────────────────────────────────────

function SeoAuditForm({ onOutput, onClose }: Omit<Props, "skillKey">) {
  const [f, setF] = useState({ url: "", businessType: "", cityArea: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!f.url || !f.businessType) { setError("URL and business type are required."); return; }
    setLoading(true); setError(null);
    try {
      const { output, fetchError } = await skillsApi.seoAudit({ ...f, cityArea: f.cityArea || undefined });
      if (fetchError) setError(`Note: ${fetchError}`);
      onOutput(output);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>LOCAL SEO AUDIT</p>
        <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>SEO audit with prioritised fix list</h3>
        <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>
          The page is fetched server-side (no paid APIs). Review the fix list and work through it yourself or share with your developer.
        </p>
      </div>
      <Field label="Page URL" hint="The specific page to audit (usually your homepage)">
        <input type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} maxLength={500}
          className="field-input text-sm" placeholder="https://yourbusiness.com" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Business type"><input value={f.businessType} onChange={(e) => setF({ ...f, businessType: e.target.value })} maxLength={100} className="field-input text-sm" placeholder="Plumbing contractor" /></Field>
        <Field label="City / service area"><input value={f.cityArea} onChange={(e) => setF({ ...f, cityArea: e.target.value })} maxLength={100} className="field-input text-sm" placeholder="Denver, CO" /></Field>
      </div>
      <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
        Note: Ahrefs and Google Search Console would add backlink and keyword data that this audit cannot assess from HTML alone.
      </p>
      <FormActions onClose={onClose} onSubmit={submit} loading={loading} error={error}
        submitLabel={loading ? "Fetching page…" : "Run audit"} />
    </div>
  );
}

// ── Form actions ──────────────────────────────────────────────────────────────

function FormActions({ onClose, onSubmit, loading, error, submitLabel = "Generate draft" }: {
  onClose: () => void; onSubmit: () => void;
  loading: boolean; error: string | null; submitLabel?: string;
}) {
  return (
    <>
      {error && <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>}
      <div className="flex gap-3 pt-1">
        <button onClick={onSubmit} disabled={loading} className="btn-primary text-sm" style={{ minWidth: "140px" }}>
          {loading ? "Working…" : submitLabel}
        </button>
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
      </div>
      <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
        Your draft shows up on Today, under Reminders. Nothing is sent automatically — you review and copy it yourself.
      </p>
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

const FORM_MAP: Record<SkillKey, React.ComponentType<Omit<Props, "skillKey">>> = {
  "inbox-triage":    InboxTriageForm,
  "review-request":  ReviewRequestForm,
  "social-calendar": SocialCalendarForm,
  "seo-audit":       SeoAuditForm,
};

export default function SkillForm({ skillKey, onOutput, onClose }: Props) {
  const Form = FORM_MAP[skillKey];
  return (
    <div className="rounded-xl p-6" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <Form onOutput={onOutput} onClose={onClose} />
    </div>
  );
}
