const steps = [
  {
    n: "01",
    title: "Tell Shea about your situation",
    detail: "A 2-minute intake captures your role, where you lose the most time, and how you prefer to work. No tech knowledge required.",
  },
  {
    n: "02",
    title: "Get a tailored plan on the call",
    detail: "Shea reviews your answers, prepares a personalised proposal, and walks you through it on a 1:1 call — what she'd build, which tools, and what it would save you.",
  },
  {
    n: "03",
    title: "She builds it, you run it",
    detail: "Shea sets up your system, tunes it to your voice and clients, and hands it off with a walkthrough. You stay in control of every message that goes out.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-navy/[0.02]" aria-labelledby="how-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="section-eyebrow mb-3">How it works</p>
          <h2 id="how-heading" className="section-heading">Human-led from start to finish.</h2>
          <p className="mt-4 text-navy/65 text-lg">
            Shea handles the design. You don&apos;t need to become an AI expert.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-orange/25" aria-hidden="true" />
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
      </div>
    </section>
  );
}
