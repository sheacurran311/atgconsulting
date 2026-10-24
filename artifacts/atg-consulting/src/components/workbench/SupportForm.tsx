/**
 * Email support form for Self-serve clients.
 * Shea's team replies within 2 business days.
 */
import { useState } from "react";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { hasOperator } from "@/lib/tiers";

export default function SupportForm({ tier }: { tier: string }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasOperator(tier)) return null; // Guided/DFY use OperatorPanel instead

  async function submit() {
    if (!subject.trim() || !message.trim()) { setError("Subject and message are required."); return; }
    setSending(true);
    setError(null);
    try {
      await api.support.submit({ subject: subject.trim(), message: message.trim() });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl p-5" style={{ background: "rgba(59,107,255,0.06)", border: "1px solid rgba(59,107,255,0.2)" }}>
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>MESSAGE SENT</p>
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--canvas-text)" }}>We got it.</p>
        <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>Shea's team will reply within 2 business days.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>EMAIL SUPPORT</p>
          <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>Contact Shea's team</p>
          <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>Replies within 2 business days.</p>
        </div>
        <span className="font-mono text-2xs px-2 py-0.5 rounded" style={{ background: "var(--canvas-1)", color: "var(--canvas-text-3)", border: "1px solid var(--canvas-border)" }}>
          SELF-SERVE
        </span>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          maxLength={200}
          className="field-input text-sm"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What do you need help with?"
          rows={4}
          maxLength={5000}
          className="field-input resize-none text-sm"
        />
        {error && <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>}
        <button onClick={submit} disabled={sending || !subject.trim() || !message.trim()} className="btn-primary text-sm">
          {sending ? "Sending…" : "Send message"}
        </button>
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--canvas-border)" }}>
        <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
          Need faster access to Shea?{" "}
          <Link to="/app/consultations" className="underline" style={{ color: "var(--blue)" }}>
            Upgrade to Guided
          </Link>{" "}
          for a direct message thread and 1:1 sessions.
        </p>
      </div>
    </div>
  );
}
