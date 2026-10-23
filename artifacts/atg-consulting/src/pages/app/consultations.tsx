import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import AppShell from "@/components/app/AppShell";
import { api, type Consultation } from "@/lib/api";

export default function ConsultationsPage() {
  const [, params] = useRoute("/app/consultations/:id");
  const detailId = params?.id;
  return detailId ? <ConsultationDetail id={detailId} /> : <ConsultationList />;
}

function ConsultationList() {
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.client.consultations().then(setItems).finally(() => setLoading(false)); }, []);
  const BOOKING_URL = typeof window !== "undefined" ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book") : "#book";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="section-eyebrow mb-1">Client portal</p>
            <h1 className="text-2xl font-extrabold text-navy">Your consultations</h1>
          </div>
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">Book a session</a>
        </div>
        {loading ? <p className="text-navy/50">Loading…</p> : items.length === 0 ? (
          <div className="rounded-2xl border border-navy/10 bg-white p-10 text-center">
            <p className="font-bold text-navy mb-2">No consultations yet</p>
            <p className="text-navy/60 text-sm mb-5">Book your 1:1 with Shea to get started.</p>
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">Book now</a>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((c) => (
              <li key={c.id}>
                <Link to={`/app/consultations/${c.id}`}>
                  <div className="rounded-2xl border border-navy/10 bg-white p-5 hover:border-orange/30 transition-colors cursor-pointer flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-navy">{c.title}</p>
                      <p className="text-navy/50 text-sm mt-0.5">
                        {c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Date TBD"}
                        {" · "}{c.durationMin} min · <span className={`font-medium ${c.status === "COMPLETED" ? "text-green-600" : c.status === "CANCELLED" ? "text-red-500" : "text-orange"}`}>{c.status.toLowerCase()}</span>
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-navy/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function ConsultationDetail({ id }: { id: string }) {
  const [c, setC] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.client.consultation(id).then(setC).finally(() => setLoading(false)); }, [id]);

  async function toggleAction(actionId: string) {
    const updated = await api.client.toggleActionItem(actionId).catch(() => null);
    if (updated && c) {
      setC({ ...c, actionItems: c.actionItems.map((a) => a.id === actionId ? updated : a) });
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <Link to="/app/consultations"><span className="btn-ghost mb-6 inline-flex">← Back</span></Link>
        {loading ? <p className="text-navy/50">Loading…</p> : !c ? <p className="text-red-500">Not found.</p> : (
          <div className="space-y-6">
            <div>
              <p className="section-eyebrow mb-1">{c.status.toLowerCase()}</p>
              <h1 className="text-2xl font-extrabold text-navy">{c.title}</h1>
              {c.scheduledAt && <p className="text-navy/55 text-sm mt-1">{new Date(c.scheduledAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })} · {c.durationMin} min</p>}
            </div>
            {c.notes && (
              <div className="rounded-2xl border border-navy/10 bg-white p-6">
                <p className="text-xs font-bold text-orange tracking-widest uppercase mb-3">Session notes</p>
                <div className="prose prose-sm prose-navy max-w-none text-navy/70 whitespace-pre-wrap">{c.notes}</div>
              </div>
            )}
            {c.recordingUrl && (
              <a href={c.recordingUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex text-sm">▶ Watch recording</a>
            )}
            {c.actionItems.filter((a) => a.owner === "CLIENT").length > 0 && (
              <div className="rounded-2xl border border-navy/10 bg-white p-6">
                <p className="text-xs font-bold text-orange tracking-widest uppercase mb-3">Your action items</p>
                <ul className="space-y-2">
                  {c.actionItems.filter((a) => a.owner === "CLIENT").map((a) => (
                    <li key={a.id} className="flex items-start gap-3">
                      <button onClick={() => toggleAction(a.id)} aria-label={a.done ? "Mark undone" : "Mark done"} className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${a.done ? "bg-orange border-orange text-white" : "border-navy/30"}`}>
                        {a.done && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <span className={`text-sm ${a.done ? "line-through text-navy/40" : "text-navy"}`}>{a.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
