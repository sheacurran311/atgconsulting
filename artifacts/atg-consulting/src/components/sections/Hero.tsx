import { Link } from "wouter";

export default function Hero() {
  const bookingUrl = import.meta.env.VITE_BOOKING_URL ?? "#book";

  return (
    <section className="relative bg-navy overflow-hidden" aria-labelledby="hero-heading">
      {/* Background accents */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-orange/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-orange/5 blur-2xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="max-w-3xl">
          <p className="section-eyebrow mb-4">1:1 AI solutions with Shea — Castle Rock, CO</p>

          <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
            A tailored AI setup,{" "}
            <span className="text-orange">built around your life.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-white/75 leading-relaxed max-w-2xl">
            Shea designs and delivers AI systems for your specific role, clients, and daily life —
            across sales, marketing, executive assistance, and customer support. You don&apos;t learn a
            tool. You get a solution.
          </p>

          <p className="mt-3 text-white/45 text-sm">
            For small business owners and independent salespeople. No tech background needed.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={bookingUrl}
              target={bookingUrl.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="btn-primary px-7 py-3.5 text-base"
            >
              Book a 1:1 with Shea
            </a>
            <Link to="/start" className="btn-secondary-white px-7 py-3.5 text-base">
              Get my free snapshot
            </Link>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="relative h-12 sm:h-16" aria-hidden="true">
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 48" fill="none" preserveAspectRatio="none">
          <path d="M0 48L1440 0V48H0Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
