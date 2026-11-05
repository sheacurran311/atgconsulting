/**
 * Admin editor for the AI Workshop and a per-client progress list.
 */
import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { api, type WorkshopAdminLesson, type WorkshopAdminModule } from "@/lib/api";

export default function AdminWorkshopPage() {
  const [modules, setModules] = useState<WorkshopAdminModule[]>([]);
  const [progress, setProgress] = useState<{ clientId: string; name: string; tier: string; percent: number; completedLessons: number; totalLessons: number }[]>([]);
  const [selected, setSelected] = useState<WorkshopAdminLesson | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    return Promise.all([
      api.admin.workshop.list(),
      api.admin.workshop.progress(),
    ]).then(([mods, board]) => {
      setModules(mods);
      setProgress(board.clients);
    }).catch((err: Error) => setError(err.message));
  }

  useEffect(() => { void load(); }, []);

  async function saveModule(mod: WorkshopAdminModule, patch: Record<string, unknown>) {
    await api.admin.workshop.updateModule(mod.id, patch);
    await load();
  }

  async function move(list: { id: string; order: number }[], index: number, dir: -1 | 1, kind: "modules" | "lessons") {
    const swap = index + dir;
    if (swap < 0 || swap >= list.length) return;
    const next = list.map((row, i) => ({ id: row.id, order: i }));
    const current = next[index];
    const other = next[swap];
    if (!current || !other) return;
    const order = current.order;
    current.order = other.order;
    other.order = order;
    await api.admin.workshop.reorder(kind === "modules" ? { modules: next } : { lessons: next });
    await load();
  }

  return (
    <AdminShell>
      <div className="max-w-content mx-auto space-y-6">
        <div>
          <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>ADMIN · WORKSHOP</p>
          <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>AI Workshop</h1>
          <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>Edit lessons, publish them, and see who has started. Learners run exercises in their own assistants.</p>
        </div>
        {error && <p className="text-sm" style={{ color: "#B91C1C" }}>{error}</p>}
        {modules.length === 0 && <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No workshop modules yet. They appear after the database is seeded.</p>}
        {modules.map((mod, index) => (
          <section key={mod.id} className="rounded-xl p-4 space-y-3" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold" style={{ color: "var(--canvas-text)" }}>{mod.title}</p>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => { void move(modules, index, -1, "modules"); }}>Up</button>
                <button type="button" onClick={() => { void move(modules, index, 1, "modules"); }}>Down</button>
                <button type="button" onClick={() => { void saveModule(mod, { status: mod.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }); }}>
                  {mod.status === "PUBLISHED" ? "Unpublish module" : "Publish module"}
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {mod.lessons.map((lesson, lessonIndex) => (
                <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <button type="button" onClick={() => setSelected(lesson)} style={{ color: "var(--canvas-text)" }}>{lesson.order + 1}. {lesson.title}</button>
                  <span className="flex gap-2 text-xs" style={{ color: "var(--canvas-text-3)" }}>
                    <span>{lesson.status}</span>
                    <button type="button" onClick={() => { void move(mod.lessons, lessonIndex, -1, "lessons"); }}>Up</button>
                    <button type="button" onClick={() => { void move(mod.lessons, lessonIndex, 1, "lessons"); }}>Down</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {selected && (
          <LessonEditor
            lesson={selected}
            onClose={() => setSelected(null)}
            onSaved={() => { setSelected(null); void load(); }}
          />
        )}

        <section className="rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
          <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)" }}>CLIENT PROGRESS</p>
          {progress.length === 0 ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No clients yet.</p> : progress.map((row) => (
            <p key={row.clientId} className="text-sm" style={{ color: "var(--canvas-text)" }}>
              {row.name} · {row.tier} · {row.completedLessons}/{row.totalLessons} · {row.percent}%
            </p>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}

function LessonEditor({ lesson, onClose, onSaved }: { lesson: WorkshopAdminLesson; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(lesson.title);
  const [body, setBody] = useState(lesson.body);
  const [exercise, setExercise] = useState(lesson.exercise);
  const [minutes, setMinutes] = useState(lesson.minutes);
  const [status, setStatus] = useState(lesson.status);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await api.admin.workshop.updateLesson(lesson.id, { title, body, exercise, minutes, status });
    setBusy(false);
    onSaved();
  }

  return (
    <section className="rounded-xl p-4 space-y-3" style={{ border: "1px solid rgba(59,107,255,0.3)", background: "var(--canvas-1)" }}>
      <p className="font-mono text-2xs" style={{ color: "var(--blue)" }}>EDIT LESSON</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="field-input text-sm w-full" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="field-input text-sm w-full" />
      <textarea value={exercise} onChange={(e) => setExercise(e.target.value)} rows={4} className="field-input text-sm w-full" />
      <label className="text-sm" style={{ color: "var(--canvas-text)" }}>
        Minutes
        <input type="number" min={1} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="field-input text-sm ml-2" />
      </label>
      <label className="text-sm block" style={{ color: "var(--canvas-text)" }}>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input text-sm ml-2">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button type="button" disabled={busy} className="btn-primary text-sm" style={{ padding: "8px 14px" }} onClick={() => { void save(); }}>{busy ? "Saving…" : "Save lesson"}</button>
        <button type="button" className="btn-secondary text-sm" style={{ padding: "8px 14px" }} onClick={onClose}>Close</button>
      </div>
    </section>
  );
}
