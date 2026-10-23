import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative bg-navy overflow-hidden" aria-labelledby="hero-heading">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-orange/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-orange/5 blur-2xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="max-w-3xl">
          <p className="section-eyebrow mb-4">AI Sales &amp; Operations Workflows</p>

          <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
            Your sales process,{" "}
            <span className="text-orange">running while you work.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-white/75 leading-relaxed max-w-2xl">
            I set up AI workflows that find prospects, research them, draft your outreach, and keep
            your follow-ups and CRM in order, so you can spend your time actually selling.
          </p>

          <p className="mt-3 text-white/45 text-sm">
            For small business owners and independent salespeople. No tech background needed.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/start" className="btn-primary px-7 py-3.5 text-base">
              Get my free plan
            </Link>
            <Link href="/#tiers" className="btn-secondary-white px-7 py-3.5 text-base">
              Join the free seminar
            </Link>
          </div>
        </div>
      </div>

      <div className="relative h-12 sm:h-16" aria-hidden="true">
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 48" fill="none" preserveAspectRatio="none">
          <path d="M0 48L1440 0V48H0Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
