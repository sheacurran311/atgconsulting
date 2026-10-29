/**
 * Admin Today dashboard — Shea's daily task list.
 * Aggregates: intake reviews, proposal drafts, content approvals,
 * catalog verification queue, upcoming sessions, DFY access items.
 */
import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { Link } from "wouter";

interface TodayTask {
  type: string;
  id: string;
  label: string;
  url: string;
  meta?: string;
  createdAt?: string;
}

interface TodayData {
  date: string;
  counts: {
    intakeReviews: number;
    proposalDrafts: number;
    contentDrafts: number;
    contentApproved: number;
    catalogQueue: number;
    upcomingSessions: number;
    legacyIntakes: number;
    total: number;
  };
  tasks: {
    intakeReviews: TodayTask[];
    proposalDrafts: TodayTask[];
    contentDrafts: TodayTask[];
    catalogQueue: TodayTask[];
    upcomingSessions: TodayTask[];
    dfyAccess: TodayTask[];
  };
}

const TASK_TYPE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  intake_review:   { color: "#D97706", bg: "rgba(217,119,6,0.08)",  label: "Intake review" },
  proposal_draft:  { color: "#3B6BFF", bg: "rgba(59,107,255,0.08)", label: "Proposal draft" },
  content_draft:   { color: "#7C3AED", bg: "rgba(124,58,237,0.08)", label: "Content draft" },
  content_publish: { color: "#16A34A", bg: "rgba(22,163,74,0.08)",  label: "Ready to publish" },
  catalog_verify:  { color: "#D97706", bg: "rgba(217,119,6,0.06)",  label: "Catalog verify" },
  upcoming_session:{ color: "#3B6BFF", bg: "rgba(59,107,255,0.06)", label: "Session" },
  dfy_access:      { color: "var(--canvas-text-3)", bg: "var(--canvas-2)", label: "DFY access" },
};

function TaskCard({ task }: { task: TodayTask }) {
  const style = TASK_TYPE_STYLES[task.type] ?? { color: "var(--canvas-text-3)", bg: "var(--canvas-2)", label: task.type };
  return (
    <Link to={task.url}>
      <div className="rounded-xl p-4 transition-all" style={{ background: style.bg, border: `1px solid ${style.color}22`, cursor: "pointer" }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-mono text-2xs" style={{ color: style.color, letterSpacing: "0.06em" }}>{style.label.toUpperCase()}</p>
          {task.createdAt && <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>{new Date(task.createdAt).toLocaleDateString()}</p>}
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>{task.label}</p>
        {task.meta && <p className="text-xs mt-0.5" style={{ color: "var(--canvas-text-3)" }}>{task.meta}</p>}
      </div>
    </Link>
  );
}

export default function AdminTodayPage() {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/today", { credentials: "include" })
      .then((r) => r.json() as Promise<TodayData>)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const allTasks: TodayTask[] = data ? [
    ...data.tasks.intakeReviews,
    ...data.tasks.proposalDrafts,
    ...data.tasks.contentDrafts,
    ...data.tasks.catalogQueue,
    ...data.tasks.upcomingSessions,
    ...data.tasks.dfyAccess,
  ] : [];

  return (
    <AdminShell>
      <div className="max-w-content mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>ADMIN · TODAY</p>
            <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>
              {data?.date ?? new Date().toISOString().split("T")[0]}
            </h1>
            {data && (
              <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>
                {data.counts.total} item{data.counts.total !== 1 ? "s" : ""} needing attention
              </p>
            )}
          </div>
          <button type="button" onClick={() => { setLoading(true); fetch("/api/admin/today", { credentials: "include" }).then((r) => r.json() as Promise<TodayData>).then(setData).finally(() => setLoading(false)); }}
            className="btn-secondary text-sm" style={{ padding: "7px 14px" }}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
        ) : allTasks.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
            <p className="text-2xl mb-2">✓</p>
            <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>All clear — nothing needs your attention right now.</p>
          </div>
        ) : (
          <>
            {/* Summary counts */}
            {data && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ["Intake reviews",  data.counts.intakeReviews,   "#D97706"],
                  ["Proposal drafts", data.counts.proposalDrafts,  "#3B6BFF"],
                  ["Content drafts",  data.counts.contentDrafts,   "#7C3AED"],
                  ["Catalog queue",   data.counts.catalogQueue,    "#D97706"],
                ].map(([label, count, color]) => (
                  <div key={label as string} className="rounded-xl p-4" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
                    <p className="font-extrabold text-2xl mb-0.5" style={{ color: color as string, letterSpacing: "-0.03em" }}>{count as number}</p>
                    <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>{(label as string).toUpperCase()}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Task cards */}
            <div className="space-y-3">
              {allTasks.map((task) => <TaskCard key={`${task.type}-${task.id}`} task={task} />)}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
