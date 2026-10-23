import { useState, useEffect } from "react";
import { Link } from "wouter";
import AppShell from "@/components/app/AppShell";
import { api, type Dashboard } from "@/lib/api";

const BOOKING_URL = typeof window !== "undefined" ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book") : "#book";

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.client.dashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleWorkflow(id: string) {
    if (!data) return;
    const updated = await api.client.toggleWorkflow(id).catch(() => null);
    if (updated) {
      setData((d) => d ? { ...d, workflowItems: d.workflowItems.map((i) => i.id === id ? updated : i) } : d);
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <p className="section-eyebrow mb-1">Your dashboard</p>
          <h1 className="text-2xl font-extrabold text-navy">
            {data?.client?.user?.name ? `Welcome back, ${data.client.user.name.split(" ")[0]}.` : "Welcome back."}
          </h1>
        </div>

        {loading && <p className="text-navy/50">Loading…</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {data && (
          <>
            {/* Next consultation */}
            {data.recentConsultation ? (
              <div className="rounded-2xl border-2 border-orange/30 bg-orange/5 p-5">
                <p className="text-xs font-bold text-orange tracking-widest uppercase mb-1">Upcoming consultation</p>
                <p className="font-bold text-navy">{data.recentConsultation.title}</p>
                {data.recentConsultation.scheduledAt && (
                  <p className="text-navy/60 text-sm mt-1">{new Date(data.recentConsultation.scheduledAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                )}
                <Link to="/app/consultations" className="text-orange text-sm font-semibold mt-2 inline-flex hover:underline">View details →</Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-navy/10 bg-white p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-navy">Book your 1:1 with Shea</p>
                  <p className="text-navy/60 text-sm mt-0.5">Schedule your consultation to get your tailored AI plan.</p>
                </div>
                <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-primary whitespace-nowrap">Book now</a>
              </div>
            )}

            {/* Workflow checklist */}
            {data.workflowItems.length > 0 && (
              <div className="rounded-2xl border border-navy/10 bg-white p-6">
                <p className="font-bold text-navy mb-4">Your workflow checklist</p>
                <ul className="space-y-2">
                  {data.workflowItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <button
                        onClick={() => toggleWorkflow(item.id)}
                        aria-label={item.done ? `Mark "${item.title}" as not done` : `Mark "${item.title}" as done`}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.done ? "bg-orange border-orange text-white" : "border-navy/30 hover:border-orange"}`}
                      >
                        {item.done && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <span className={`text-sm ${item.done ? "line-through text-navy/40" : "text-navy"}`}>{item.title}</span>
                      <span className="text-xs text-navy/30 capitalize">{item.area.replace("_", " ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick links */}
            <div className="grid sm:grid-cols-3 gap-4">
              <QuickLink to="/app/documents" label="Documents" count={data.activeDocCount} icon="📄" />
              <QuickLink to="/app/reports" label="Latest report" subtitle={data.recentReport?.date} icon="📊" />
              <QuickLink to="/app/learn" label="Learn" subtitle="Modules" icon="🎓" />
            </div>
          </>
        )}

        {/* No client profile yet */}
        {!loading && !data?.client && (
          <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center">
            <p className="font-bold text-navy mb-2">Complete your intake to get started</p>
            <p className="text-navy/60 text-sm mb-5">Answer a few quick questions and get a personalised AI snapshot from Shea.</p>
            <Link to="/start" className="btn-primary">Get my free snapshot</Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function QuickLink({ to, label, count, subtitle, icon }: { to: string; label: string; count?: number; subtitle?: string | null; icon: string }) {
  return (
    <Link to={to}>
      <div className="rounded-xl border border-navy/10 bg-white p-4 hover:border-orange/30 transition-colors cursor-pointer">
        <span className="text-2xl">{icon}</span>
        <p className="font-bold text-navy mt-2">{label}</p>
        {count !== undefined && <p className="text-navy/50 text-sm">{count} item{count !== 1 ? "s" : ""}</p>}
        {subtitle && <p className="text-navy/50 text-sm">{subtitle}</p>}
      </div>
    </Link>
  );
}
