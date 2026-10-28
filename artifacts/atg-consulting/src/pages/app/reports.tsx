import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import AppShell from "@/components/app/AppShell";
import { NeedsIntake } from "@/components/app/IntakeGate";
import { api, missingProfile, type Report } from "@/lib/api";

export default function ReportsPage() {
  const [, params] = useRoute("/app/reports/:date");
  return params?.date ? <ReportDetail date={params.date} /> : <ReportList />;
}

function ReportList() {
  return (
    <AppShell>
      <ReportListBody />
    </AppShell>
  );
}

function ReportListBody() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsIntake, setNeedsIntake] = useState(false);
  useEffect(() => {
    api.client.reports()
      .then(setReports)
      .catch((e: unknown) => { if (missingProfile(e)) setNeedsIntake(true); })
      .finally(() => setLoading(false));
  }, []);

  return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="section-eyebrow mb-1">Client portal</p>
          <h1 className="text-2xl font-extrabold text-canvas-text">Your daily reports</h1>
          <p className="text-canvas-text text-sm mt-1">Shea reviews and publishes these. Check in to see your progress.</p>
        </div>
        {loading ? <p className="text-canvas-text">Loading…</p> : needsIntake ? <NeedsIntake /> : reports.length === 0 ? (
          <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-10 text-center">
            <p className="font-bold text-canvas-text mb-1">No reports published yet</p>
            <p className="text-canvas-text text-sm">Shea will publish your daily digests once your workflows are live.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id}>
                <Link to={`/app/reports/${r.date}`}>
                  <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-5 hover:border-blue/30 transition-colors cursor-pointer flex items-center justify-between">
                    <div>
                      <p className="font-bold text-canvas-text">{new Date(r.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                      <p className="text-canvas-text text-sm mt-0.5">{r.publishedAt ? `Published ${new Date(r.publishedAt).toLocaleDateString()}` : "Published"}</p>
                    </div>
                    <svg className="w-5 h-5 text-canvas-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
  );
}

function ReportDetail({ date }: { date: string }) {
  return (
    <AppShell>
      <ReportDetailBody date={date} />
    </AppShell>
  );
}

function ReportDetailBody({ date }: { date: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsIntake, setNeedsIntake] = useState(false);
  useEffect(() => {
    api.client.report(date)
      .then(setReport)
      .catch((e: unknown) => { if (missingProfile(e)) setNeedsIntake(true); })
      .finally(() => setLoading(false));
  }, [date]);

  return (
      <div className="max-w-2xl mx-auto">
        <Link to="/app/reports"><span className="btn-ghost mb-6 inline-flex">← Back</span></Link>
        {loading ? <p className="text-canvas-text">Loading…</p> : needsIntake ? <NeedsIntake /> : !report ? <p className="text-red-500">Not found.</p> : (
          <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-6 sm:p-8">
            <p className="section-eyebrow mb-2">Daily report</p>
            <h1 className="text-2xl font-extrabold text-canvas-text mb-6">
              {new Date(report.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h1>
            <div className="prose prose-sm max-w-none text-canvas-text whitespace-pre-wrap leading-relaxed">
              {report.contentMarkdown}
            </div>
          </div>
        )}
      </div>
  );
}
