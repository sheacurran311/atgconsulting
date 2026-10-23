/**
 * Operator panel — persistent sidebar component showing Shea's presence.
 * Displayed in the client Workbench sidebar below navigation.
 */
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { SHEA } from "@/content/shea";

export default function OperatorPanel() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // Check for unread messages from Shea
    api.client.messages().then((msgs) => {
      const u = msgs.filter((m) => m.fromAdmin && !m.readAt).length;
      setUnread(u);
    }).catch(() => null);
  }, []);

  async function sendMessage() {
    if (!message.trim()) return;
    setSending(true);
    await api.client.sendMessage(message.trim()).catch(() => null);
    setSending(false);
    setSent(true);
    setMessage("");
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--ink-border)", background: "var(--ink-2)" }}>
      {/* Shea header */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--ink-border)" }}>
        <div className="flex items-center gap-3 mb-2">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
            style={{ background: "rgba(59,107,255,0.15)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.3)" }}
          >
            {SHEA.initials}
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--ink-text)", letterSpacing: "-0.01em" }}>{SHEA.name}</p>
            <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>YOUR OPERATOR</p>
          </div>
          {unread > 0 && (
            <span className="ml-auto font-mono text-2xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--blue)", color: "#fff", minWidth: "18px", textAlign: "center" }}>
              {unread}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--ink-text-3)" }}>{SHEA.workbenchTagline}</p>
      </div>

      {/* Message input */}
      <div className="p-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={SHEA.messagePlaceholder}
          rows={3}
          maxLength={2000}
          className="w-full rounded-lg text-xs resize-none outline-none"
          style={{ background: "var(--ink-3)", border: "1px solid var(--ink-border)", color: "var(--ink-text)", padding: "8px 10px", fontFamily: "var(--font-sans)" }}
        />
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !message.trim()}
            className="flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors"
            style={{ background: "rgba(59,107,255,0.15)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.3)" }}
          >
            {sent ? "✓ Sent" : sending ? "Sending…" : "Message Shea"}
          </button>
        </div>
      </div>
    </div>
  );
}
