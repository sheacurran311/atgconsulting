const steps = [
  {
    n: "01",
    title: "Map your sales process",
    detail: "We walk through how you find, pitch, and close clients today, and spot the repetitive parts.",
  },
  {
    n: "02",
    title: "Build your workflows",
    detail:
      "We set up AI routines for prospecting, research, outreach drafts, follow-up reminders, and inbox and CRM upkeep, using the tools that fit you.",
  },
  {
    n: "03",
    title: "Tune it until it's yours",
    detail:
      "You stay in charge of every message that goes out. We adjust until the drafts sound like you and the leads look like your best clients.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-navy/[0.02]" aria-labelledby="how-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="section-eyebrow mb-3">The process</p>
          <h2 id="how-heading" className="section-heading">Three steps from busywork to a system.</h2>
          <p className="mt-4 text-navy/65 text-lg">
            Built around your business and your existing tools, not the other way around.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop only) */}
          <div
            className="hidden md:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-orange/25"
            aria-hidden="true"
          />
          {steps.map((s) => (
            <div key={s.n} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 w-24 h-24 rounded-full bg-navy flex flex-col items-center justify-center shadow-lg mb-6">
                <span className="text-orange font-bold text-[10px] tracking-widest uppercase">Step</span>
                <span className="text-white font-extrabold text-3xl leading-none">{s.n}</span>
              </div>
              <h3 className="font-bold text-navy text-xl mb-3">{s.title}</h3>
              <p className="text-navy/60 leading-relaxed">{s.detail}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-center text-navy/55 max-w-2xl mx-auto">
          I&apos;m tool-agnostic. I&apos;ve built with ChatGPT, Cursor, Replit, Grok Bot, and plenty more, and
          I&apos;ll pick what fits your budget, your comfort level, and the tools you already use.
        </p>
      </div>
    </section>
  );
}
