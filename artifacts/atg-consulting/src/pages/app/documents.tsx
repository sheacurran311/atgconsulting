import { useState, useEffect } from "react";
import AppShell from "@/components/app/AppShell";
import { NeedsIntake } from "@/components/app/IntakeGate";
import { api, missingProfile, type Document } from "@/lib/api";

const TYPE_LABELS: Record<string, string> = { PLAN: "Plan", ONE_PAGER: "One-pager", WORKFLOW: "Workflow", SESSION: "Session notes", OTHER: "Document" };
const MIME_ICON: Record<string, string> = { "application/pdf": "📄", "image/png": "🖼️", "image/jpeg": "🖼️" };

export default function DocumentsPage() {
  return (
    <AppShell>
      <DocumentsBody />
    </AppShell>
  );
}

function DocumentsBody() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsIntake, setNeedsIntake] = useState(false);

  useEffect(() => {
    api.client.documents()
      .then(setDocs)
      .catch((e: unknown) => { if (missingProfile(e)) setNeedsIntake(true); })
      .finally(() => setLoading(false));
  }, []);

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="section-eyebrow mb-1">Client portal</p>
          <h1 className="text-2xl font-extrabold text-canvas-text">Your documents</h1>
          <p className="text-canvas-text text-sm mt-1">Plans, session notes, and resources Shea has shared with you.</p>
        </div>

        {loading ? <p className="text-canvas-text">Loading…</p> : needsIntake ? <NeedsIntake /> : docs.length === 0 ? (
          <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-10 text-center">
            <p className="font-bold text-canvas-text mb-1">No documents yet</p>
            <p className="text-canvas-text text-sm">Shea will add your plan and session documents here after your consultation.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {docs.map((doc) => (
              <li key={doc.id} className="rounded-2xl border border-canvas-border bg-canvas-1 p-5 flex items-center gap-4">
                <span className="text-2xl flex-shrink-0">{MIME_ICON[doc.mime] ?? "📎"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-canvas-text truncate">{doc.title}</p>
                  <p className="text-canvas-text text-xs mt-0.5">{TYPE_LABELS[doc.type] ?? doc.type} · {formatSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
                <a
                  href={`/api/documents/${doc.id}/download`}
                  className="btn-secondary text-sm py-2 px-4 flex-shrink-0"
                  aria-label={`Download ${doc.title}`}
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
  );
}
