/**
 * Today inbox — drafts waiting for review, plus the follow-up composer.
 * Approve and edit keep the draft on screen so it can be copied. Nothing is sent.
 */
import { useState, useEffect, type FormEvent } from "react";
import { Link } from "wouter";
import { api, type OutputItem } from "@/lib/api";
import EmptyWorkbench from "@/components/workbench/EmptyWorkbench";

const TYPE_LABELS: Record<string, string> = {
  briefing: "Morning briefing",
  email_draft: "Email draft",
  lead_list: "Lead list",
  social_post: "Social post",
  quote_followup: "Quote follow-up",
  review_request: "Review request",
};

function displayBody(item: OutputItem): string {
  return item.editedContent?.trim() ? item.editedContent : item.content;
}

export default function TodayInbox({ tier, compose, onCompose }: { tier: string; compose: boolean; onCompose: (open: boolean) => void }) {
  const [items, setItems] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    api.workbench.today().then(setItems).catch(() => null).finally(() => setLoading(false));
  }, []);

  async function act(id: string, action: "approve" | "edit" | "dismiss", content?: string) {
    setActionError(null);
    try {
      const updated = await api.workbench.reviewOutput(id, action, content);
      if (action === "dismiss") {
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i)));
      }
      if (editing === id) setEditing(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not update that draft.");
    }
  }

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((current) => (current === id ? null : current)), 2000);
    } catch {
      setActionError("Could not copy. Select the draft and copy it yourself.");
    }
  }

  function addDraft(item: OutputItem) {
    setItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)]);
    onCompose(false);
  }

  const pending = items.filter((i) => i.status === "pending");

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>TODAY</p>
          <h2 className="font-extrabold text-xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
            Outputs waiting for you
            {pending.length > 0 && (
              <span className="ml-2 font-mono text-sm font-normal px-2 py-0.5 rounded" style={{ background: "var(--blue-subtle-lt)", color: "var(--blue-btn)" }}>
                {pending.length}
              </span>
            )}
          </h2>
        </div>
        <button type="button" onClick={() => onCompose(true)} className="btn-primary text-sm" style={{ padding: "8px 14px" }}>
          Draft a follow-up
        </button>
      </div>

      {compose && <FollowUpForm onCreated={addDraft} onClose={() => onCompose(false)} />}

      {actionError && (
        <p className="text-sm mb-4" role="alert" style={{ color: "#DC2626" }}>{actionError}</p>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      ) : items.length === 0 && !compose ? (
        <EmptyWorkbench tier={tier} onDraft={() => onCompose(true)} />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const ready = item.status === "approved" || item.status === "edited";
            const body = displayBody(item);
            return (
              <div key={item.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
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

                <div className="p-5" style={{ background: "var(--canvas-1)" }}>
                  <p className="font-semibold text-sm mb-3" style={{ color: "var(--canvas-text)" }}>{item.subject}</p>
                  {ready && (
                    <p className="text-sm font-semibold mb-3" style={{ color: "#16A34A" }}>
                      Ready to copy. Nothing has been sent.
                    </p>
                  )}

                  {editing === item.id ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={8}
                      aria-label="Edit draft"
                      className="w-full rounded-lg text-sm resize-none outline-none p-3"
                      style={{ border: "1px solid var(--blue)", background: "var(--canvas-2)", color: "var(--canvas-text)", boxShadow: "0 0 0 3px rgba(59,107,255,0.1)" }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--canvas-text-2)" }}>{body}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 px-5 py-3 flex-wrap" style={{ borderTop: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
                  {editing === item.id ? (
                    <>
                      <button type="button" onClick={() => act(item.id, "edit", editContent)} className="btn-primary text-sm" style={{ padding: "7px 14px" }}>Save draft</button>
                      <button type="button" onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancel</button>
                    </>
                  ) : ready ? (
                    <button type="button" onClick={() => copyText(item.id, `${item.subject}\n\n${body}`)} className="btn-primary text-sm" style={{ padding: "7px 14px" }}>
                      {copied === item.id ? "Copied" : "Copy"}
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => act(item.id, "approve")} className="btn-primary text-sm" style={{ padding: "7px 14px" }}>Approve</button>
                      <button type="button" onClick={() => { setEditing(item.id); setEditContent(body); }} className="btn-secondary text-sm" style={{ padding: "7px 14px" }}>Edit</button>
                      <button type="button" onClick={() => act(item.id, "dismiss")} className="btn-ghost text-sm" style={{ color: "var(--canvas-text-3)" }}>Dismiss</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FollowUpForm({ onCreated, onClose }: { onCreated: (item: OutputItem) => void; onClose: () => void }) {
  const [who, setWho] = useState("");
  const [lastTouch, setLastTouch] = useState("");
  const [wantToSay, setWantToSay] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPlan, setNeedsPlan] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setNeedsPlan(false);
    try {
      const item = await api.workbench.draftFollowUp({ who: who.trim(), lastTouch: lastTouch.trim(), wantToSay: wantToSay.trim() });
      onCreated(item);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not draft that follow-up.";
      setError(message);
      if (/save the plan|intake/i.test(message)) setNeedsPlan(true);
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl p-5 mb-5 space-y-3" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>DRAFT A FOLLOW-UP</p>
      <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
        You review the email here, then copy it into your own mail. Nothing is sent.
      </p>
      <label className="block text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>
        Who are you writing to?
        <input value={who} onChange={(e) => setWho(e.target.value)} required maxLength={120} className="field-input mt-1 text-sm font-normal" />
      </label>
      <label className="block text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>
        What happened last?
        <textarea value={lastTouch} onChange={(e) => setLastTouch(e.target.value)} required maxLength={500} rows={3} className="field-input mt-1 text-sm font-normal resize-none" placeholder="Last call, email, or visit" />
      </label>
      <label className="block text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>
        What do you want to say?
        <textarea value={wantToSay} onChange={(e) => setWantToSay(e.target.value)} required maxLength={1000} rows={4} className="field-input mt-1 text-sm font-normal resize-none" />
      </label>
      {error && <p className="text-sm" role="alert" style={{ color: "#DC2626" }}>{error}</p>}
      {needsPlan && (
        <p className="text-sm">
          <Link to="/start" className="underline" style={{ color: "var(--blue)" }}>Finish the intake and save the plan</Link>
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={sending} className="btn-primary text-sm" style={{ padding: "8px 14px" }}>{sending ? "Drafting…" : "Draft a follow-up"}</button>
        <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
      </div>
    </form>
  );
}
