import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import AppShell from "@/components/app/AppShell";
import { api, type Report } from "@/lib/api";

export default function ReportsPage() {
  const [, params] = useRoute("/app/reports/:date");
  return params?.date ? <ReportDetail date={params.date} /> : <ReportList />;
}

function ReportList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.client.reports().then(setReports).finally(() => setLoading(false)); }, []);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="section-eyebrow mb-1">Client portal</p>
          <h1 className="text-2xl font-extrabold text-navy">Your daily reports</h1>
          <p className="text-navy/55 text-sm mt-1">Shea reviews and publishes these. Check in to see your progress.</p>
        </div>
        {loading ? <p className="text-navy/50">Loading…</p> : reports.length === 0 ? (
          <div className="rounded-2xl border border-navy/10 bg-white p-10 text-center">
            <p className="font-bold text-navy mb-1">No reports published yet</p>
            <p className="text-navy/55 text-sm">Shea will publish your daily digests once your workflows are live.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id}>
                <Link to={`/app/reports/${r.date}`}>
                  <div className="rounded-2xl border border-navy/10 bg-white p-5 hover:border-orange/30 transition-colors cursor-pointer flex items-center justify-between">
                    <div>
                      <p className="font-bold text-navy">{new Date(r.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                      <p className="text-navy/50 text-sm mt-0.5">{r.publishedAt ? `Published ${new Date(r.publishedAt).toLocaleDateString()}` : "Published"}</p>
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

function ReportDetail({ date }: { date: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.client.report(date).then(setReport).finally(() => setLoading(false)); }, [date]);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <Link to="/app/reports"><span className="btn-ghost mb-6 inline-flex">← Back</span></Link>
        {loading ? <p className="text-navy/50">Loading…</p> : !report ? <p className="text-red-500">Not found.</p> : (
          <div className="rounded-2xl border border-navy/10 bg-white p-6 sm:p-8">
            <p className="section-eyebrow mb-2">Daily report</p>
            <h1 className="text-2xl font-extrabold text-navy mb-6">
              {new Date(report.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h1>
            <div className="prose prose-sm max-w-none text-navy/70 whitespace-pre-wrap leading-relaxed">
              {report.contentMarkdown}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
