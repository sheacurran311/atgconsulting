import { Link } from "wouter";

export default function CTA() {
  const bookingUrl = typeof window !== "undefined" ? (import.meta.env.VITE_BOOKING_URL ?? "#book") : "#book";

  return (
    <section id="cta" className="py-20 sm:py-28 bg-navy" aria-labelledby="cta-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 id="cta-heading" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
          Ready for a system that{" "}
          <span className="text-orange">works while you do?</span>
        </h2>
        <p className="mt-5 text-lg text-white/65 max-w-xl mx-auto leading-relaxed">
          Book a free 20-minute call. Shea will review your situation and map out exactly what a
          tailored AI setup would look like for your business — no obligation.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href={bookingUrl}
            target={bookingUrl.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="btn-primary px-8 py-4 text-base"
          >
            Book a 1:1 with Shea
          </a>
          <Link to="/start" className="btn-secondary-white px-8 py-4 text-base">
            Get my free snapshot first
          </Link>
        </div>
        <p className="mt-10 text-white/40 text-sm">
          Prefer to read first?{" "}
          <a
            href="/brand/ATG_Consulting_OnePager.pdf"
            download
            className="underline text-white/60 hover:text-white transition-colors"
            aria-label="Download the ATG Consulting one-pager PDF"
          >
            Download the one-pager
          </a>
        </p>
      </div>
    </section>
  );
}
