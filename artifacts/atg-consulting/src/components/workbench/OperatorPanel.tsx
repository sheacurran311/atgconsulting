/**
 * Operator panel — message thread with Shea.
 * The client writes here. Nothing is sent on the client's behalf.
 */
import { useState, useEffect } from "react";
import { api, type ClientMsg } from "@/lib/api";
import { SHEA } from "@/content/shea";

export default function OperatorPanel() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [thread, setThread] = useState<ClientMsg[]>([]);
  const [unread, setUnread] = useState(0);
  const [photoFailed, setPhotoFailed] = useState(false);

  function load() {
    api.client.messages().then((msgs) => {
      setThread(msgs);
      setUnread(msgs.filter((m) => m.fromAdmin && !m.readAt).length);
    }).catch(() => null);
  }

  useEffect(() => { load(); }, []);

  async function sendMessage() {
    if (!message.trim()) return;
    setSending(true);
    const saved = await api.client.sendMessage(message.trim()).catch(() => null);
    setSending(false);
    setMessage("");
    if (saved) {
      setThread((current) => [...current, saved]);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }
  }

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--ink-border)", background: "var(--ink-2)" }}>
      <div className="p-4" style={{ borderBottom: "1px solid var(--ink-border)" }}>
        <div className="flex items-center gap-3 mb-2">
          {SHEA.photo && !photoFailed ? (
            <img
              src={SHEA.photo}
              alt=""
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              style={{ border: "1px solid rgba(59,107,255,0.3)" }}
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
              style={{ background: "rgba(59,107,255,0.15)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.3)" }}
              aria-label={`${SHEA.name} photo placeholder`}
            >
              {SHEA.initials}
            </div>
          )}
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

      <div className="px-3 pt-3 space-y-2 max-h-48 overflow-y-auto">
        {thread.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--ink-text-3)" }}>No messages yet.</p>
        ) : thread.map((item) => (
          <div key={item.id} className="rounded-lg px-2.5 py-2" style={{ background: item.fromAdmin ? "rgba(59,107,255,0.12)" : "var(--ink-3)" }}>
            <p className="font-mono text-2xs mb-0.5" style={{ color: "var(--ink-text-3)", letterSpacing: "0.04em" }}>
              {item.fromAdmin ? "SHEA" : "YOU"} · {new Date(item.createdAt).toLocaleString()}
            </p>
            <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--ink-text)" }}>{item.body}</p>
          </div>
        ))}
      </div>

      <div className="p-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={SHEA.messagePlaceholder}
          rows={5}
          maxLength={2000}
          className="w-full rounded-lg text-xs resize-none outline-none leading-snug"
          style={{
            background: "var(--ink-3)",
            border: "1px solid var(--ink-border)",
            color: "var(--ink-text)",
            padding: "8px 10px",
            fontFamily: "var(--font-sans)",
            boxSizing: "content-box",
            lineHeight: 1.45,
            fieldSizing: "content",
            maxHeight: "140px",
            overflowY: "auto",
          }}
        />
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => { void sendMessage(); }}
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
