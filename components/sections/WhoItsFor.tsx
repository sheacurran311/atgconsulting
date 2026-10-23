const audiences = [
  {
    title: "Independent contractor salespeople",
    detail: "Commission reps who need a steady stream of new leads.",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    title: "Small business owners",
    detail: "Owners who are also the sales department.",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    title: "Solo service providers",
    detail: "Consultants, trades, and agencies with no time to prospect.",
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
];

export default function WhoItsFor() {
  return (
    <section id="who" className="py-20 sm:py-28 bg-navy/[0.02]" aria-labelledby="who-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <h2 id="who-heading" className="section-heading">
            Built for people who sell for a living, but don&apos;t have a sales team.
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {audiences.map((a) => (
            <div key={a.title} className="p-6 rounded-2xl border border-navy/10 bg-white flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange/10 text-orange flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon} />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-navy">{a.title}</h3>
                <p className="text-navy/60 text-sm mt-1 leading-relaxed">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-navy/55 text-sm">
          <strong className="text-navy">Probably not a fit</strong> if you already have a full sales ops team, or if you want AI to send messages for you with no review. I build systems where you stay in control.
        </p>
      </div>
    </section>
  );
}
