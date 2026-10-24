/**
 * Admin tiers page — tool plan review, DFY applications, support tickets.
 * Combined into one page with tabs.
 */
import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { api, type ToolPlan, type DfyApplication, type SupportTicket } from "@/lib/api";

// ── Tool plan review ──────────────────────────────────────────────────────────

function ToolPlansTab() {
  const [plans, setPlans] = useState<(ToolPlan & { client: { user: { name: string | null; email: string | null } } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTools, setEditTools] = useState("");
  const [editSteps, setEditSteps] = useState("");
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => { api.admin.toolPlans().then((d) => setPlans(d)).catch(() => null).finally(() => setLoading(false)); }, []);

  async function approvePlan(clientId: string) {
    setApproving(clientId);
    await api.admin.approveToolPlan(clientId).catch(() => null);
    setPlans((p) => p.filter((x) => x.clientId !== clientId));
    setApproving(null);
  }

  return (
    <div>
      <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>DRAFT PLANS AWAITING REVIEW</p>
      {loading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      : plans.length === 0 ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No draft plans.</p>
      : plans.map((plan) => (
        <div key={plan.id} className="mb-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
          <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{plan.client.user.name ?? plan.clientId}</p>
              <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>{plan.source} · {new Date(plan.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(editing === plan.id ? null : plan.id); setEditTools(plan.toolsJson); setEditSteps(plan.stepsJson); }} className="btn-ghost text-xs py-1 px-2">Edit</button>
              <button onClick={() => approvePlan(plan.clientId)} disabled={approving === plan.clientId} className="btn-primary text-xs py-1 px-3">
                {approving === plan.clientId ? "Approving…" : "Approve & release"}
              </button>
            </div>
          </div>
          {editing === plan.id && (
            <div className="p-5 space-y-3" style={{ background: "var(--canvas-1)" }}>
              <div>
                <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)" }}>TOOLS JSON</p>
                <textarea value={editTools} onChange={(e) => setEditTools(e.target.value)} rows={6} className="field-input font-mono text-xs resize-none" />
              </div>
              <div>
                <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)" }}>STEPS JSON</p>
                <textarea value={editSteps} onChange={(e) => setEditSteps(e.target.value)} rows={6} className="field-input font-mono text-xs resize-none" />
              </div>
              <button onClick={async () => {
                await api.admin.patchToolPlan(plan.clientId, { toolsJson: editTools, stepsJson: editSteps }).catch(() => null);
                setEditing(null);
              }} className="btn-primary text-sm">Save edits</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── DFY applications ──────────────────────────────────────────────────────────

function DfyTab() {
  const [data, setData] = useState<{ applications: (DfyApplication & { client: unknown })[]; cap: number; spotsLeft: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cap, setCap] = useState<number | null>(null);

  useEffect(() => {
    api.admin.dfyApplications().then((d) => {
      setData({ applications: d.applications as (DfyApplication & { client: unknown })[], cap: d.cap, spotsLeft: d.spotsLeft });
      setCap(d.cap);
    }).catch(() => null).finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: string) {
    await api.admin.updateDfyApp(id, { status }).catch(() => null);
    setData((prev) => {
      if (!prev) return prev;
      const updated = prev.applications.map((a) =>
        a.id === id ? ({ ...a, status } as DfyApplication & { client: unknown }) : a
      );
      return { ...prev, applications: updated };
    });
  }

  return (
    <div>
      {data && (
        <div className="flex items-center gap-4 mb-5 p-4 rounded-xl" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
          <div>
            <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>MONTHLY CAP (DFY_MONTHLY_CAP)</p>
            <p className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)" }}>{data.cap}</p>
          </div>
          <div>
            <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>SPOTS LEFT THIS MONTH</p>
            <p className="font-extrabold text-2xl" style={{ color: data.spotsLeft > 0 ? "var(--blue-btn)" : "#DC2626" }}>{data.spotsLeft}</p>
          </div>
        </div>
      )}
      {loading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      : !data?.applications.length ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No applications yet.</p>
      : data.applications.map((app) => {
        const a = app as DfyApplication & { client?: { user: { name: string | null; email: string | null } } };
        return (
          <div key={app.id} className="mb-3 rounded-xl p-4 flex items-center justify-between gap-3" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{a.client?.user.name ?? app.clientId}</p>
              <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>{a.client?.user.email ?? "—"} · Applied {new Date(app.createdAt).toLocaleDateString()}</p>
            </div>
            <select value={app.status} onChange={(e) => updateStatus(app.id, e.target.value)}
              className="rounded-lg border text-xs px-2 py-1.5 focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--canvas-border)", color: "var(--canvas-text)", background: "var(--canvas-1)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}
            >
              {["applied","waitlisted","accepted","declined"].map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
          </div>
        );
      })}
    </div>
  );
}

// ── Support tickets ───────────────────────────────────────────────────────────

function SupportTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");

  useEffect(() => { api.admin.supportTickets(filter).then((d) => setTickets(d)).catch(() => null).finally(() => setLoading(false)); }, [filter]);

  async function updateStatus(id: string, status: string) {
    await api.admin.updateSupportTicket(id, status).catch(() => null);
    setTickets((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["open","replied","closed"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className="font-mono text-2xs px-3 py-1 rounded" style={{ background: filter === s ? "var(--canvas-text)" : "var(--canvas-2)", color: filter === s ? "var(--canvas-1)" : "var(--canvas-text-2)", letterSpacing: "0.06em" }}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>
      {loading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      : tickets.length === 0 ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No {filter} tickets.</p>
      : tickets.map((t) => (
        <div key={t.id} className="mb-3 rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{t.subject}</p>
            <div className="flex gap-1 flex-shrink-0">
              {t.status !== "replied" && <button onClick={() => updateStatus(t.id, "replied")} className="btn-secondary text-xs py-1 px-2">Mark replied</button>}
              {t.status !== "closed" && <button onClick={() => updateStatus(t.id, "closed")} className="btn-ghost text-xs py-1 px-2">Close</button>}
            </div>
          </div>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--canvas-text-2)" }}>{t.message}</p>
          <p className="font-mono text-2xs mt-2" style={{ color: "var(--canvas-text-3)" }}>{new Date(t.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "toolplans", label: "Tool plans" },
  { id: "dfy",       label: "DFY applications" },
  { id: "support",   label: "Support tickets" },
];

export default function AdminTiersPage() {
  const [tab, setTab] = useState("toolplans");
  return (
    <AdminShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-6" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>Tiers &amp; plans</h1>
        <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid var(--canvas-border)" }}>
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-sm font-semibold"
              style={{ border: "none", borderBottom: `2px solid ${tab === t.id ? "var(--blue)" : "transparent"}`, color: tab === t.id ? "var(--blue)" : "var(--canvas-text-2)", background: "transparent", marginBottom: "-1px" }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "toolplans" && <ToolPlansTab />}
        {tab === "dfy"       && <DfyTab />}
        {tab === "support"   && <SupportTab />}
      </div>
    </AdminShell>
  );
}
