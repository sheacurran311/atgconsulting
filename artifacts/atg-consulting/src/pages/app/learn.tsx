import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import AppShell from "@/components/app/AppShell";
import { api, type Module } from "@/lib/api";

const TIER_LABELS: Record<string, string> = { NONE: "Free", SELF_SERVE: "Self-serve", GUIDED: "Guided", WHITE_GLOVE: "White Glove" };

type ModuleWithMeta = Module & { locked: boolean; completed: boolean };

export default function LearnPage() {
  const [, params] = useRoute("/app/learn/:slug");
  return params?.slug ? <ModuleDetail slug={params.slug} /> : <ModuleList />;
}

function ModuleList() {
  const [modules, setModules] = useState<ModuleWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.modules.list().then(setModules).finally(() => setLoading(false)); }, []);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="section-eyebrow mb-1">Client portal</p>
          <h1 className="text-2xl font-extrabold text-canvas-text">Learn</h1>
          <p className="text-canvas-text text-sm mt-1">Modules to help you get the most from your AI setup.</p>
        </div>
        {loading ? <p className="text-canvas-text">Loading…</p> : modules.length === 0 ? (
          <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-10 text-center">
            <p className="font-bold text-canvas-text mb-1">No modules published yet</p>
            <p className="text-canvas-text text-sm">Shea will publish learning resources here over time.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {modules.map((m) => (
              <li key={m.id}>
                {m.locked ? (
                  <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-5 opacity-60 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs bg-canvas-2 text-canvas-text px-2 py-0.5 rounded-full font-medium">{TIER_LABELS[m.minTier]} and above</span>
                      <p className="font-bold text-canvas-text mt-1">{m.title}</p>
                      <p className="text-canvas-text text-sm">{m.description}</p>
                    </div>
                    <span className="text-xl">🔒</span>
                  </div>
                ) : (
                  <Link to={`/app/learn/${m.slug}`}>
                    <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-5 hover:border-blue/30 transition-colors cursor-pointer flex items-center justify-between gap-4">
                      <div>
                        {m.completed && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Completed</span>}
                        <p className="font-bold text-canvas-text mt-1">{m.title}</p>
                        <p className="text-canvas-text text-sm">{m.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-canvas-text flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function ModuleDetail({ slug }: { slug: string }) {
  const [m, setM] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    api.modules.get(slug)
      .then(setM)
      .catch((e: Error & { status?: number }) => {
        if (e.status === 403) setError("Upgrade your plan to access this module.");
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  async function markComplete() {
    await api.modules.complete(slug).catch(() => null);
    setCompleted(true);
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <Link to="/app/learn"><span className="btn-ghost mb-6 inline-flex">← Back to Learn</span></Link>
        {loading ? <p className="text-canvas-text">Loading…</p> : error ? (
          <div className="rounded-2xl border border-blue/20 bg-blue/5 p-6 text-center">
            <p className="font-bold text-canvas-text mb-2">🔒 {error}</p>
            <Link to="/app/account" className="btn-primary text-sm">View upgrade options</Link>
          </div>
        ) : m ? (
          <div className="space-y-6">
            <div>
              <p className="section-eyebrow mb-1">Module</p>
              <h1 className="text-2xl font-extrabold text-canvas-text">{m.title}</h1>
            </div>
            {m.videoUrl && (
              <div className="rounded-2xl overflow-hidden border border-canvas-border">
                <iframe src={m.videoUrl} className="w-full aspect-video" allowFullScreen title={m.title} />
              </div>
            )}
            <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-6 prose prose-sm max-w-none text-canvas-text whitespace-pre-wrap leading-relaxed">
              {m.body}
            </div>
            {!completed && (
              <button onClick={markComplete} className="btn-primary">Mark as completed ✓</button>
            )}
            {completed && <p className="text-green-600 font-semibold">✓ Marked as completed</p>}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
