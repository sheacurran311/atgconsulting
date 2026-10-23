import { useState, useEffect } from "react";
import { Link } from "wouter";
import AdminShell from "@/components/admin/AdminShell";
import { api, type IntakeRecord } from "@/lib/api";

const STATUS_TABS = ["NEW", "REVIEWED", "CONVERTED", "SPAM"];
const STATUS_COLORS: Record<string, string> = { NEW: "bg-orange/10 text-orange", REVIEWED: "bg-blue-50 text-blue-700", CONVERTED: "bg-green-50 text-green-700", SPAM: "bg-red-50 text-red-600" };

export default function AdminIntakesPage() {
  const [status, setStatus] = useState("NEW");
  const [intakes, setIntakes] = useState<IntakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.admin.intakes(status).then(setIntakes).finally(() => setLoading(false));
  }, [status]);

  async function updateStatus(id: string, newStatus: string) {
    await api.admin.updateIntakeStatus(id, newStatus);
    setIntakes((i) => i.filter((x) => x.id !== id));
  }

  return (
    <AdminShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-extrabold text-navy mb-6">Intake inbox</h1>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {STATUS_TABS.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${status === s ? "bg-navy text-white" : "bg-navy/8 text-navy/60 hover:text-navy"}`}>
              {s.toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? <p className="text-navy/50">Loading…</p> : intakes.length === 0 ? (
          <p className="text-navy/40 text-center py-10">No {status.toLowerCase()} intakes.</p>
        ) : (
          <div className="space-y-3">
            {intakes.map((intake) => {
              const plan = intake.plans[0];
              const isExpanded = expanded === intake.id;
              return (
                <div key={intake.id} className="rounded-2xl border border-navy/10 bg-white overflow-hidden">
                  <button className="w-full p-5 text-left flex items-start justify-between gap-4" onClick={() => setExpanded(isExpanded ? null : intake.id)}>
                    <div>
                      <p className="font-bold text-navy">{intake.name}</p>
                      <p className="text-navy/50 text-sm">{intake.email} · {new Date(intake.createdAt).toLocaleDateString()}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[intake.status] ?? ""}`}>{intake.status}</span>
                        {JSON.parse(intake.areas).map((a: string) => <span key={a} className="px-2 py-0.5 rounded-full text-xs bg-navy/8 text-navy/60">{a.replace("_", " ")}</span>)}
                      </div>
                    </div>
                    <svg className={`w-5 h-5 text-navy/30 flex-shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-navy/8 p-5 space-y-4">
                      {/* Plan snapshot */}
                      {plan && (
                        <div className="bg-navy/[0.03] rounded-xl p-4">
                          <p className="text-xs font-bold text-orange uppercase tracking-widest mb-2">AI snapshot</p>
                          <p className="font-bold text-navy text-sm">{plan.aiReadinessLabel}</p>
                          <p className="text-navy/65 text-sm mt-1">{plan.aiReadinessSummary}</p>
                          <p className="text-navy/50 text-xs mt-2">Recommended: {plan.recommendedTier.replace("_", " ")}</p>
                        </div>
                      )}

                      {/* If client exists */}
                      {intake.client && (
                        <div className="flex items-center gap-3">
                          <span className="text-green-600 text-sm font-semibold">✓ Converted to client</span>
                          <Link to={`/admin/clients/${intake.client.id}`}><span className="text-orange text-sm font-semibold hover:underline cursor-pointer">View client →</span></Link>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {status !== "REVIEWED" && <button onClick={() => updateStatus(intake.id, "REVIEWED")} className="btn-secondary text-xs py-1.5 px-3">Mark reviewed</button>}
                        {status !== "SPAM" && <button onClick={() => updateStatus(intake.id, "SPAM")} className="btn-ghost text-xs py-1.5 px-3 text-red-500">Mark spam</button>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
