const steps = [
  { label: "Find", detail: "Each week, a workflow builds a list of new taprooms, brewery openings, and team events in their territory." },
  { label: "Research", detail: "It pulls together a short brief on each one: recent releases, events, and who to contact." },
  { label: "Draft", detail: "It writes a first-touch email in the rep's voice for them to review and send." },
  { label: "Follow up", detail: "It flags who hasn't replied and drafts a friendly nudge." },
  { label: "Keep records", detail: "It logs every touch in the CRM so nothing slips." },
];

export default function Example() {
  return (
    <section id="example" className="py-20 sm:py-28 bg-white" aria-labelledby="example-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3 items-start mb-10 p-4 rounded-xl bg-orange/10 border border-orange/20" role="note">
            <svg className="flex-shrink-0 w-5 h-5 text-orange mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-orange-700">
              <strong>Illustrative example, not a testimonial.</strong> Made-up scenario to show what a workflow looks like. Not a client result.
            </p>
          </div>

          <p className="section-eyebrow mb-3">Example walkthrough</p>
          <h2 id="example-heading" className="section-heading">What a workflow actually looks like</h2>
          <p className="mt-4 text-navy/65 text-lg leading-relaxed">
            Picture an independent rep who sells large-format printing to craft breweries and sports teams. Great on the phone, but finding new accounts keeps getting pushed to &ldquo;later.&rdquo;
          </p>

          <ol className="mt-10 space-y-5" role="list">
            {steps.map((s, i) => (
              <li key={s.label} className="flex gap-5">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && <div className="w-px flex-1 bg-navy/15 mt-2" aria-hidden="true" />}
                </div>
                <div className="pb-5">
                  <h3 className="font-bold text-navy">{s.label}</h3>
                  <p className="text-navy/60 text-sm mt-1 leading-relaxed">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
