/**
 * Admin workflow templates — list, edit, reset, export as SKILL.md.
 * Admin can edit name, description, systemPrompt, userPromptTemplate,
 * inputSchema, outputFormat, minTier, verticalTags, enabled.
 * "Reset to default" restores the code-seeded version.
 * "Download SKILL.md" exports the template for use in Grok Bot / Claude / ChatGPT.
 */
import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { api, type WorkflowTemplate } from "@/lib/api";

const TIER_LABELS: Record<string, string> = {
  NONE: "All (no plan required)", SELF_SERVE: "Self-serve+",
  GUIDED: "Guided+", WHITE_GLOVE: "Done-for-you only",
};

export default function AdminWorkflowTemplatesPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorkflowTemplate | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<WorkflowTemplate>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.admin.workflowTemplates?.().then((t: WorkflowTemplate[]) => setTemplates(t)).catch(() => null).finally(() => setLoading(false));
  }, []);

  function openTemplate(t: WorkflowTemplate) {
    setSelected(t);
    setDraft(t);
    setEditing(false);
    setMsg(null);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    const updated = await api.admin.patchWorkflowTemplate?.(selected.slug, draft).catch(() => null);
    if (updated) {
      setTemplates((prev) => prev.map((t) => t.slug === selected.slug ? updated as WorkflowTemplate : t));
      setSelected(updated as WorkflowTemplate);
      setDraft(updated as WorkflowTemplate);
      setMsg("Saved.");
    }
    setSaving(false);
    setEditing(false);
  }

  async function reset() {
    if (!selected) return;
    setResetting(true);
    const updated = await api.admin.resetWorkflowTemplate?.(selected.slug).catch(() => null);
    if (updated) {
      setTemplates((prev) => prev.map((t) => t.slug === selected.slug ? updated as WorkflowTemplate : t));
      setSelected(updated as WorkflowTemplate);
      setDraft(updated as WorkflowTemplate);
      setMsg("Reset to code default.");
    }
    setResetting(false);
    setEditing(false);
  }

  const skillUrl = selected ? api.admin.skillMdUrl?.(selected.slug) : null;

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-6" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>
          Workflow templates
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--canvas-text-2)" }}>
          These templates drive every Workbench workflow. Edit system prompts here; the LLM loads the active version at runtime.
          Admin edits are versioned. "Reset" restores the code-seeded default. "Download SKILL.md" exports the template for use in Grok Bot, Claude, or ChatGPT.
        </p>

        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar list */}
          <div className="space-y-1">
            {loading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
            : templates.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => openTemplate(t)}
                className="w-full text-left px-3 py-2.5 rounded-lg transition-all"
                style={{
                  background: selected?.slug === t.slug ? "rgba(59,107,255,0.08)" : "transparent",
                  border: `1px solid ${selected?.slug === t.slug ? "var(--blue)" : "transparent"}`,
                  color: "var(--canvas-text)",
                }}
              >
                <p className="text-sm font-medium">{t.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.04em" }}>{t.slug}</span>
                  {!t.enabled && <span className="font-mono text-2xs" style={{ color: "#DC2626" }}>DISABLED</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Editor panel */}
          {!selected ? (
            <div className="rounded-xl p-8 text-center" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
              <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Select a template to view and edit it.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex gap-2">
                  {!editing && (
                    <button onClick={() => setEditing(true)} className="btn-secondary text-xs py-1.5 px-3">Edit</button>
                  )}
                  {editing && (
                    <>
                      <button onClick={save} disabled={saving} className="btn-primary text-xs py-1.5 px-3">{saving ? "Saving…" : "Save"}</button>
                      <button onClick={() => { setEditing(false); setDraft(selected); }} className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
                    </>
                  )}
                  <button onClick={reset} disabled={resetting} className="btn-ghost text-xs py-1.5 px-3" style={{ color: "#DC2626" }}>
                    {resetting ? "Resetting…" : "Reset to default"}
                  </button>
                </div>
                <div className="flex gap-2">
                  {skillUrl && (
                    <a href={skillUrl} download={`${selected.slug}.skill.md`} className="btn-secondary text-xs py-1.5 px-3">
                      ↓ Download SKILL.md
                    </a>
                  )}
                  <button
                    className="btn-ghost text-xs py-1.5 px-3"
                    onClick={async () => {
                      const updated = await api.admin.patchWorkflowTemplate?.(selected.slug, { enabled: !selected.enabled }).catch(() => null);
                      if (updated) { setSelected(updated as WorkflowTemplate); setTemplates((p) => p.map((t) => t.slug === selected.slug ? updated as WorkflowTemplate : t)); }
                    }}
                  >
                    {selected.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>

              {msg && <p className="text-xs font-semibold" style={{ color: "var(--blue)" }}>{msg}</p>}

              {/* Fields */}
              <Field label="Name" mono="name">
                {editing
                  ? <input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="field-input text-sm" />
                  : <p className="text-sm" style={{ color: "var(--canvas-text)" }}>{selected.name}</p>}
              </Field>

              <Field label="Description" mono="description">
                {editing
                  ? <textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} className="field-input resize-none text-sm" />
                  : <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{selected.description}</p>}
              </Field>

              <Field label="Minimum tier" mono="minTier">
                {editing
                  ? <select value={draft.minTier ?? "SELF_SERVE"} onChange={(e) => setDraft({ ...draft, minTier: e.target.value })} className="field-input text-sm">
                      {Object.entries(TIER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  : <p className="text-sm" style={{ color: "var(--canvas-text)" }}>{TIER_LABELS[selected.minTier] ?? selected.minTier}</p>}
              </Field>

              <Field label="System prompt" mono="systemPrompt">
                {editing
                  ? <textarea value={draft.systemPrompt ?? ""} onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })} rows={12} className="field-input resize-none font-mono text-xs" />
                  : <pre className="font-mono text-xs whitespace-pre-wrap rounded-lg p-3 overflow-auto max-h-80" style={{ background: "var(--canvas-2)", color: "var(--canvas-text-2)", border: "1px solid var(--canvas-border)" }}>{selected.systemPrompt}</pre>}
              </Field>

              <Field label="User prompt template" mono="userPromptTemplate">
                {editing
                  ? <textarea value={draft.userPromptTemplate ?? ""} onChange={(e) => setDraft({ ...draft, userPromptTemplate: e.target.value })} rows={6} className="field-input resize-none font-mono text-xs" />
                  : <pre className="font-mono text-xs whitespace-pre-wrap rounded-lg p-3 overflow-auto max-h-48" style={{ background: "var(--canvas-2)", color: "var(--canvas-text-2)", border: "1px solid var(--canvas-border)" }}>{selected.userPromptTemplate}</pre>}
              </Field>

              <div className="flex items-center gap-2 pt-2">
                <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>v{selected.version}</span>
                <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>·</span>
                <span className="font-mono text-2xs" style={{ color: selected.enabled ? "var(--blue)" : "#DC2626" }}>
                  {selected.enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function Field({ label, mono, children }: { label: string; mono: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-xs" style={{ color: "var(--canvas-text)" }}>{label}</span>
        <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>{mono}</span>
      </div>
      {children}
    </div>
  );
}
