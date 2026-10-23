/**
 * Client Workbench dashboard — the product.
 * Tabs: Today (output inbox) · My Workflows · Hours Saved
 * Persistent operator panel in sidebar.
 */
import { useState } from "react";
import { Link } from "wouter";
import AppShell from "@/components/app/AppShell";
import TodayInbox from "@/components/workbench/TodayInbox";
import MyWorkflows from "@/components/workbench/MyWorkflows";
import { api, type HoursSavedData } from "@/lib/api";
import { useEffect } from "react";

const BOOKING_URL = typeof window !== "undefined" ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book") : "#book";

function HoursSavedTab() {
  const [data, setData] = useState<HoursSavedData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.workbench.hoursSaved().then(setData).catch(() => null).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <div className="mb-5">
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>LEDGER</p>
        <h2 className="font-extrabold text-xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Hours saved</h2>
      </div>

      {loading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      : !data || (data.totalRuns === 0 && data.approved === 0) ? (
        <div className="rounded-xl p-8 text-center" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
          <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>NO DATA YET</p>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--canvas-text)" }}>Your hours ledger starts when your first workflow goes live.</p>
          <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Shea logs every run and you&apos;ll see what&apos;s been handled for you here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>TOTAL RUNS</p>
              <p className="font-extrabold text-3xl" style={{ color: "var(--blue)", letterSpacing: "-0.04em" }}>{data.totalRuns}</p>
            </div>
            <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>OUTPUTS APPROVED</p>
              <p className="font-extrabold text-3xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.04em" }}>{data.approved}</p>
            </div>
          </div>
          {data.runs.slice(0, 10).map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
              <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{r.summary ?? "Workflow run completed"}</p>
              <p className="font-mono text-2xs flex-shrink-0" style={{ color: "var(--canvas-text-3)" }}>{new Date(r.runAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "today",     label: "Today" },
  { id: "workflows", label: "My workflows" },
  { id: "hours",     label: "Hours saved" },
];

export default function DashboardPage() {
  const [tab, setTab] = useState("today");

  return (
    <AppShell>
      <div className="max-w-content mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>ATG WORKBENCH</p>
            <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>Your dashboard</h1>
          </div>
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm" style={{ padding: "8px 14px" }}>
            Book 1:1 with Shea
          </a>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid var(--canvas-border)" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{
                color: tab === t.id ? "var(--blue)" : "var(--canvas-text-2)",
                marginBottom: "-1px",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${tab === t.id ? "var(--blue)" : "transparent"}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "today"     && <TodayInbox />}
        {tab === "workflows" && <MyWorkflows />}
        {tab === "hours"     && <HoursSavedTab />}

        {/* Request new workflow */}
        <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--canvas-border)" }}>
          <RequestWorkflowForm />
        </div>
      </div>
    </AppShell>
  );
}

function RequestWorkflowForm() {
  const [desc, setDesc] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!desc.trim()) return;
    setSending(true);
    await api.workbench.requestWorkflow(desc.trim()).catch(() => null);
    setSending(false);
    setSent(true);
    setDesc("");
  }

  return (
    <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>REQUEST A NEW WORKFLOW</p>
      <p className="text-sm mb-3" style={{ color: "var(--canvas-text-2)" }}>
        Tell Shea what you&apos;d like automated next. She&apos;ll review it and add it to your design queue.
      </p>
      {sent ? (
        <p className="text-sm font-semibold" style={{ color: "#16A34A" }}>✓ Request sent to Shea</p>
      ) : (
        <div className="flex gap-3">
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Send a thank-you after every completed job"
            className="field-input flex-1 text-sm"
          />
          <button onClick={submit} disabled={sending || !desc.trim()} className="btn-primary text-sm" style={{ padding: "10px 16px" }}>
            {sending ? "Sending…" : "Request"}
          </button>
        </div>
      )}
    </div>
  );
}
