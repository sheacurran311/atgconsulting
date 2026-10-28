import { Link } from "wouter";

export default function CTA() {
  const bookingUrl = typeof window !== "undefined"
    ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book")
    : "#book";

  return (
    <section
      id="cta"
      className="relative overflow-hidden py-20 sm:py-32"
      style={{ background: "var(--ink)" }}
      aria-labelledby="cta-heading"
    >
      {/* Subtle grid backdrop */}
      <div className="absolute inset-0 bg-dot-dark pointer-events-none" aria-hidden="true" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(249,115,22,0.08) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      <div className="relative max-w-wide mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p
          className="font-mono text-xs font-medium mb-5"
          style={{ color: "var(--blue)", letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          Ready when you are
        </p>

        <h2
          id="cta-heading"
          className="display-lg"
          style={{ color: "var(--ink-text)" }}
        >
          Spend your time selling,{" "}
          <span style={{ color: "var(--blue)" }}>not chasing.</span>
        </h2>

        <p className="mt-5 text-md max-w-xl mx-auto leading-relaxed" style={{ color: "var(--ink-text-2)" }}>
          Book a free 20-minute call. Shea will review your situation and map out exactly what a
          tailored AI setup would look like for your business — no obligation.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href={bookingUrl}
            target={bookingUrl.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ fontSize: "15px", padding: "12px 24px" }}
          >
            Book a 1:1 with Shea
          </a>
          <Link to="/intake">
            <span
              className="btn-secondary-white"
              style={{ fontSize: "15px", padding: "12px 24px" }}
            >
              Start your free assessment
            </span>
          </Link>
        </div>

        <p className="mt-8 text-sm" style={{ color: "var(--ink-text-3)" }}>
          Prefer to read first?{" "}
          <a
            href="/brand/ATG_Consulting_OnePager.pdf"
            download
            className="underline transition-colors"
            style={{ color: "var(--ink-text-2)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--ink-text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-text-2)")}
            aria-label="Download the ATG Consulting one-pager PDF"
          >
            Download the one-pager
          </a>
        </p>
      </div>
    </section>
  );
}
