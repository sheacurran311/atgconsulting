/**
 * Today inbox — output items awaiting client review.
 * Approve / Edit / Dismiss UI with API stubs and empty state.
 */
import { useState, useEffect } from "react";
import { api, type OutputItem } from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  briefing: "Morning briefing",
  email_draft: "Email draft",
  lead_list: "Lead list",
  social_post: "Social post",
  quote_followup: "Quote follow-up",
  review_request: "Review request",
};

export default function TodayInbox() {
  const [items, setItems] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    api.workbench.today().then(setItems).catch(() => null).finally(() => setLoading(false));
  }, []);

  async function act(id: string, action: "approve" | "edit" | "dismiss", content?: string) {
    await api.workbench.reviewOutput(id, action, content).catch(() => null);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editing === id) setEditing(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>TODAY</p>
          <h2 className="font-extrabold text-xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
            Outputs waiting for you
            {items.length > 0 && (
              <span className="ml-2 font-mono text-sm font-normal px-2 py-0.5 rounded" style={{ background: "var(--blue-subtle-lt)", color: "var(--blue-btn)" }}>
                {items.length}
              </span>
            )}
          </h2>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
          <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>INBOX CLEAR</p>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--canvas-text)" }}>Nothing to review right now.</p>
          <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>New outputs from your workflows will appear here when they run.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
              {/* Item header */}
              <div className="flex items-center justify-between px-5 py-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xs px-2 py-0.5 rounded" style={{ background: "rgba(59,107,255,0.1)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.2)", letterSpacing: "0.06em" }}>
                    {TYPE_LABELS[item.type] ?? item.type}
                  </span>
                  <span className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
                    from <strong style={{ color: "var(--canvas-text)" }}>{item.workflowName ?? "workflow"}</strong>
                  </span>
                </div>
                {item.sheaBadge && (
                  <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>{item.sheaBadge}</span>
                )}
              </div>

              {/* Content */}
              <div className="p-5" style={{ background: "var(--canvas-1)" }}>
                <p className="font-semibold text-sm mb-3" style={{ color: "var(--canvas-text)" }}>{item.subject}</p>

                {editing === item.id ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={6}
                    className="w-full rounded-lg text-sm resize-none outline-none p-3"
                    style={{ border: "1px solid var(--blue)", background: "var(--canvas-2)", color: "var(--canvas-text)", boxShadow: "0 0 0 3px rgba(59,107,255,0.1)" }}
                  />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--canvas-text-2)" }}>
                    {item.content.slice(0, 400)}{item.content.length > 400 ? "…" : ""}
                  </p>
                )}
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2 px-5 py-3" style={{ borderTop: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
                {editing === item.id ? (
                  <>
                    <button onClick={() => act(item.id, "edit", editContent)} className="btn-primary text-sm" style={{ padding: "7px 14px" }}>✓ Save &amp; approve</button>
                    <button onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => act(item.id, "approve")} className="btn-primary text-sm" style={{ padding: "7px 14px" }}>✓ Approve</button>
                    <button onClick={() => { setEditing(item.id); setEditContent(item.content); }} className="btn-secondary text-sm" style={{ padding: "7px 14px" }}>✎ Edit</button>
                    <button onClick={() => act(item.id, "dismiss")} className="btn-ghost text-sm" style={{ color: "var(--canvas-text-3)" }}>✕ Dismiss</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
