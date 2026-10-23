/**
 * Admin message inbox — view and reply to client messages.
 * Also shows workflow requests.
 */
import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { api, type ClientMsg, type AdminThread as Thread, type WorkflowReqAdmin as WorkflowReq } from "@/lib/api";

export default function AdminMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [requests, setRequests] = useState<WorkflowReq[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ClientMsg[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"messages" | "requests">("messages");

  useEffect(() => {
    Promise.all([
      api.admin.messages().then((d) => setThreads(d as Thread[])),
      api.admin.workflowRequests().then((d) => setRequests(d as WorkflowReq[])),
    ]).catch(() => null).finally(() => setLoading(false));
  }, []);

  async function openThread(clientId: string) {
    setSelected(clientId);
    const msgs = await api.admin.getThread(clientId).catch(() => [] as ClientMsg[]);
    setThread(msgs);
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    const msg = await api.admin.replyMessage(selected, reply.trim()).catch(() => null);
    if (msg) setThread((t) => [...t, msg]);
    setReply("");
    setSending(false);
  }

  async function updateRequest(id: string, status: string) {
    await api.admin.updateWorkflowRequest(id, status).catch(() => null);
    setRequests((r) => r.map((x) => x.id === id ? { ...x, status } : x));
  }

  return (
    <AdminShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-6" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>
          Client inbox
        </h1>

        {/* Tab toggle */}
        <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid var(--canvas-border)" }}>
          {[{ id: "messages" as const, label: "Messages" }, { id: "requests" as const, label: "Workflow requests" }].map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-sm font-semibold"
              style={{ border: "none", borderBottom: `2px solid ${tab === t.id ? "var(--blue)" : "transparent"}`, color: tab === t.id ? "var(--blue)" : "var(--canvas-text-2)", background: "transparent", marginBottom: "-1px" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? <p style={{ color: "var(--canvas-text-3)" }}>Loading…</p> : tab === "messages" ? (
          <div className="grid md:grid-cols-[280px_1fr] gap-6">
            {/* Thread list */}
            <div className="space-y-1">
              {threads.length === 0 ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No messages yet.</p>
              : threads.map((th) => (
                <button key={th.clientId} type="button" onClick={() => openThread(th.clientId)}
                  className="w-full text-left p-3 rounded-lg transition-all"
                  style={{ background: selected === th.clientId ? "rgba(59,107,255,0.06)" : "var(--canvas-2)", border: `1px solid ${selected === th.clientId ? "var(--blue)" : "var(--canvas-border)"}` }}
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>{th.client?.user.name ?? th.client?.user.email ?? th.clientId}</p>
                  {th.latest && <p className="text-xs mt-0.5 truncate" style={{ color: "var(--canvas-text-3)" }}>{th.latest.body.slice(0, 60)}</p>}
                </button>
              ))}
            </div>

            {/* Thread view */}
            <div>
              {!selected ? (
                <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Select a thread to view messages.</p>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
                  <div className="max-h-64 overflow-y-auto p-4 space-y-3" style={{ background: "var(--canvas-1)" }}>
                    {thread.map((m) => (
                      <div key={m.id} className={`flex ${m.fromAdmin ? "justify-end" : "justify-start"}`}>
                        <div className="rounded-xl px-3 py-2 max-w-xs text-sm" style={{ background: m.fromAdmin ? "rgba(59,107,255,0.1)" : "var(--canvas-2)", border: `1px solid ${m.fromAdmin ? "rgba(59,107,255,0.2)" : "var(--canvas-border)"}`, color: "var(--canvas-text)" }}>
                          <p>{m.body}</p>
                          <p className="font-mono text-2xs mt-1" style={{ color: "var(--canvas-text-3)" }}>
                            {m.fromAdmin ? "Shea" : "Client"} · {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 p-3" style={{ borderTop: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
                    <input type="text" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()}
                      placeholder="Reply as Shea…" className="field-input flex-1 text-sm" />
                    <button onClick={sendReply} disabled={sending || !reply.trim()} className="btn-primary text-sm" style={{ padding: "10px 14px" }}>
                      {sending ? "…" : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.length === 0 ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No workflow requests yet.</p>
            : requests.map((r) => (
              <div key={r.id} className="rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>{r.client?.user.name ?? r.clientId}</p>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>{r.description}</p>
                    <p className="font-mono text-2xs mt-2" style={{ color: "var(--canvas-text-3)" }}>{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <select value={r.status} onChange={(e) => updateRequest(r.id, e.target.value)}
                    className="rounded-lg border text-xs px-2 py-1.5 focus:outline-none focus:ring-2"
                    style={{ borderColor: "var(--canvas-border)", color: "var(--canvas-text)", background: "var(--canvas-1)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}
                  >
                    {["open","acknowledged","designing","done"].map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
