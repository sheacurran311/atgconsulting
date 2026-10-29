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

interface FallbackEvent {
  at: string;
  feature: string;
  reason: string;
  detail?: string;
}

interface TodayData {
  date: string;
  actionsReady?: boolean;
  counts: {
    intakeReviews: number;
    proposalDrafts: number;
    contentDrafts: number;
    contentApproved: number;
    catalogQueue: number;
    upcomingSessions: number;
    total: number;
  };
  tasks: {
    intakeReviews: TodayTask[];
    proposalDrafts: TodayTask[];
    contentDrafts: TodayTask[];
    catalogQueue: TodayTask[];
    upcomingSessions: TodayTask[];
    dfyAccess: TodayTask[];
    supportTickets?: TodayTask[];
    clientMessages?: TodayTask[];
    workflowRequests?: TodayTask[];
  };
  ai?: {
    enabled: boolean;
    keyConfigured: boolean;
    model: string;
    health: { ok: boolean; model: string; latencyMs?: number; error?: string; checkedAt: string } | null;
    fallbacks: FallbackEvent[];
  };
  catalogHarvest?: {
    status: string;
    finishedAt: string;
    inserted: number;
    linkFailures: number;
    note?: string;
    skippedSources: { source: string; reason: string }[];
  } | null;
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

function TaskCard({ task, busy, onDone, onSnooze }: {
  task: TodayTask;
  busy: boolean;
  onDone: () => void;
  onSnooze: () => void;
}) {
  const style = TASK_TYPE_STYLES[task.type] ?? { color: "var(--canvas-text-3)", bg: "var(--canvas-2)", label: task.type };
  return (
    <div className="rounded-xl p-4" style={{ background: style.bg, border: `1px solid ${style.color}22` }}>
      <div className="flex items-start justify-between gap-3">
        <Link to={task.url}>
          <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="font-mono text-2xs" style={{ color: style.color, letterSpacing: "0.06em" }}>{style.label.toUpperCase()}</p>
            {task.createdAt && <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>{new Date(task.createdAt).toLocaleDateString()}</p>}
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>{task.label}</p>
          {task.meta && <p className="text-xs mt-0.5" style={{ color: "var(--canvas-text-3)" }}>{task.meta}</p>}
          </div>
        </Link>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button type="button" disabled={busy} onClick={onDone} className="text-xs font-medium px-2.5 py-1 rounded" style={{ background: "var(--canvas-1)", border: "1px solid var(--canvas-border)", color: "var(--canvas-text)" }}>
            Done
          </button>
          <button type="button" disabled={busy} onClick={onSnooze} className="text-xs font-medium px-2.5 py-1 rounded" style={{ background: "var(--canvas-1)", border: "1px solid var(--canvas-border)", color: "var(--canvas-text-2)" }}>
            Snooze
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTodayPage() {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  function load() {
    setLoading(true);
    return fetch("/api/admin/today", { credentials: "include" })
      .then((r) => r.json() as Promise<TodayData>)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }

  useEffect(() => { void load(); }, []);

  async function act(task: TodayTask, action: "done" | "snooze") {
    const itemKey = `${task.type}:${task.id}`;
    setBusyKey(itemKey);
    setActionError(null);
    const response = await fetch("/api/admin/today/action", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemKey, action, ...(action === "snooze" ? { snoozeHours: 24 } : {}) }),
    });
    setBusyKey(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      setActionError(payload.error ?? "Could not update that item.");
      return;
    }
    setData((current) => {
      if (!current) return current;
      const drop = (items: TodayTask[]) => items.filter((item) => `${item.type}:${item.id}` !== itemKey);
      const tasks = {
        intakeReviews: drop(current.tasks.intakeReviews),
        proposalDrafts: drop(current.tasks.proposalDrafts),
        contentDrafts: drop(current.tasks.contentDrafts),
        catalogQueue: drop(current.tasks.catalogQueue),
        upcomingSessions: drop(current.tasks.upcomingSessions),
        dfyAccess: drop(current.tasks.dfyAccess),
        supportTickets: drop(current.tasks.supportTickets ?? []),
        clientMessages: drop(current.tasks.clientMessages ?? []),
        workflowRequests: drop(current.tasks.workflowRequests ?? []),
      };
      return {
        ...current,
        tasks,
        counts: {
          ...current.counts,
          intakeReviews: tasks.intakeReviews.length,
          proposalDrafts: tasks.proposalDrafts.length,
          contentDrafts: tasks.contentDrafts.filter((item) => item.type === "content_draft").length,
          catalogQueue: tasks.catalogQueue.length,
          upcomingSessions: tasks.upcomingSessions.length,
          total: tasks.intakeReviews.length + tasks.proposalDrafts.length + tasks.contentDrafts.filter((item) => item.type === "content_draft").length + tasks.catalogQueue.length + tasks.supportTickets.length + tasks.clientMessages.length + tasks.workflowRequests.length,
        },
      };
    });
  }

  async function checkHealth() {
    setCheckingHealth(true);
    const response = await fetch("/api/admin/today/health", { method: "POST", credentials: "include" });
    setCheckingHealth(false);
    if (!response.ok) return;
    const payload = await response.json() as NonNullable<TodayData["ai"]>;
    setData((current) => current ? { ...current, ai: payload } : current);
  }

  const allTasks: TodayTask[] = data ? [
    ...data.tasks.intakeReviews,
    ...data.tasks.proposalDrafts,
    ...data.tasks.contentDrafts,
    ...data.tasks.catalogQueue,
    ...data.tasks.upcomingSessions,
    ...data.tasks.dfyAccess,
    ...(data.tasks.supportTickets ?? []),
    ...(data.tasks.clientMessages ?? []),
    ...(data.tasks.workflowRequests ?? []),
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
          <button type="button" onClick={() => { void load(); }}
            className="btn-secondary text-sm" style={{ padding: "7px 14px" }}>
            Refresh
          </button>
        </div>

        {data?.ai && (
          <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>AI HEALTH</p>
                <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>
                  {data.ai.keyConfigured ? data.ai.model : "XAI_API_KEY is not set"}
                  {data.ai.health ? ` · ${data.ai.health.ok ? "reachable" : "unreachable"}` : ""}
                  {data.ai.health?.latencyMs != null ? ` · ${data.ai.health.latencyMs}ms` : ""}
                </p>
                {data.ai.health?.error && <p className="text-xs mt-1" style={{ color: "#B91C1C" }}>{data.ai.health.error}</p>}
              </div>
              <button type="button" onClick={() => { void checkHealth(); }} disabled={checkingHealth} className="btn-secondary text-sm" style={{ padding: "7px 14px" }}>
                {checkingHealth ? "Checking…" : "Check AI"}
              </button>
            </div>
            {data.ai.fallbacks.length > 0 && (
              <div className="space-y-1">
                <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>FALLBACK ERRORS</p>
                {data.ai.fallbacks.slice(0, 8).map((event, index) => (
                  <p key={`${event.at}-${index}`} className="text-xs" style={{ color: "var(--canvas-text-2)" }}>
                    {new Date(event.at).toLocaleString()} · {event.feature} · {event.reason}{event.detail ? ` · ${event.detail}` : ""}
                  </p>
                ))}
              </div>
            )}
            {data.catalogHarvest && (
              <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
                Catalog harvest: {data.catalogHarvest.status}
                {data.catalogHarvest.finishedAt ? ` · ${data.catalogHarvest.inserted} new` : ""}
                {data.catalogHarvest.note ? ` · ${data.catalogHarvest.note}` : ""}
                {data.catalogHarvest.skippedSources.map((item) => ` · ${item.source}: ${item.reason}`).join("")}
              </p>
            )}
          </div>
        )}

        {data?.actionsReady === false && (
          <p className="text-sm" style={{ color: "#B91C1C" }}>
            Done and snooze need a schema update. Run pnpm --filter @workspace/api-server db:push.
          </p>
        )}
        {actionError && <p className="text-sm" style={{ color: "#B91C1C" }}>{actionError}</p>}

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
              {allTasks.map((task) => (
                <TaskCard
                  key={`${task.type}-${task.id}`}
                  task={task}
                  busy={busyKey === `${task.type}:${task.id}`}
                  onDone={() => { void act(task, "done"); }}
                  onSnooze={() => { void act(task, "snooze"); }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
