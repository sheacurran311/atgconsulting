import { Link } from "wouter";
import LogoMark from "@/components/LogoMark";

const BOOKING_URL = typeof window !== "undefined"
  ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book")
  : "#book";

/** Mock plan-result card rendered in the hero — gives a product-preview feel */
function PlanPreview() {
  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        background: "var(--ink-1)",
        border: "1px solid var(--ink-border)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        maxWidth: 440,
      }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-1.5 px-4 py-3"
        style={{ borderBottom: "1px solid var(--ink-border)", background: "var(--ink-2)" }}
      >
        <LogoMark variant="dark" size={18} aria-hidden blink />
        <span className="font-mono text-2xs ml-1.5" style={{ color: "var(--ink-text-3)" }}>
          atgconsulting.io/start/result
        </span>
      </div>

      <div className="p-5 space-y-3">
        {/* AI readiness badge */}
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-2xs font-medium px-2 py-1 rounded"
            style={{ background: "var(--blue-subtle-dk)", color: "var(--blue)", letterSpacing: "0.06em" }}
          >
            AI READINESS
          </span>
        </div>

        <div style={{ color: "var(--ink-text)" }}>
          <p className="font-extrabold text-lg" style={{ letterSpacing: "-0.025em" }}>
            Regular User
          </p>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--ink-text-2)" }}>
            You're already getting value from AI weekly. Shea will build a tailored system around your specific role.
          </p>
        </div>

        {/* Focus area cards */}
        <div className="space-y-2">
          {[
            { area: "Sales",        why: "A pipeline that fills itself while you focus on closing." },
            { area: "Marketing",    why: "Content and campaigns without the daily grind." },
          ].map((a) => (
            <div
              key={a.area}
              className="rounded-md p-3"
              style={{ background: "var(--ink-2)", border: "1px solid var(--ink-3)" }}
            >
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>
                {a.area.toUpperCase()}
              </p>
              <p className="text-sm" style={{ color: "var(--ink-text-2)", lineHeight: "1.4" }}>
                {a.why}
              </p>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: "1px solid var(--ink-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--ink-text-3)" }}>
            White Glove — done for you
          </span>
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded"
            style={{ background: "var(--blue-btn)", color: "#fff" }}
          >
            Book 1:1 with Shea →
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--ink)" }}
      aria-labelledby="hero-heading"
    >
      {/* Dot-grid background */}
      <div className="absolute inset-0 bg-dot-dark pointer-events-none" aria-hidden="true" />

      {/* Radial gradient fade over grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249,115,22,0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-wide mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-0 sm:pt-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Left: copy */}
          <div className="max-w-xl lg:max-w-none">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-6">
              <span
                className="font-mono text-xs font-medium"
                style={{ color: "var(--blue)", letterSpacing: "0.1em", textTransform: "uppercase" }}
              >
                Human-led AI solutions
              </span>
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: "var(--ink-border)" }}
                aria-hidden="true"
              />
              <span
                className="font-mono text-xs"
                style={{ color: "var(--ink-text-3)", letterSpacing: "0.04em" }}
              >
                Castle Rock, CO
              </span>
            </div>

            {/* H1 */}
            <h1
              id="hero-heading"
              className="display-xl"
              style={{ color: "var(--ink-text)" }}
            >
              A tailored AI setup,{" "}
              <span style={{ color: "var(--blue)" }}>
                built around your&nbsp;life.
              </span>
            </h1>

            <p
              className="mt-6 text-md leading-relaxed max-w-lg"
              style={{ color: "var(--ink-text-2)" }}
            >
              Shea designs and delivers AI systems for your specific role, clients,
              and daily life — across sales, marketing, executive assistance, and
              customer support. You don&apos;t learn a tool. You get a solution.
            </p>

            <p
              className="mt-3 text-sm"
              style={{ color: "var(--ink-text-3)" }}
            >
              For small business owners and independent salespeople. No tech background needed.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={BOOKING_URL}
                target={BOOKING_URL.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ fontSize: "15px", padding: "12px 22px" }}
              >
                Book a 1:1 with Shea
              </a>
              <Link to="/start">
                <span
                  className="btn-secondary-white"
                  style={{ fontSize: "15px", padding: "12px 22px" }}
                >
                  Get my free snapshot
                </span>
              </Link>
            </div>

            {/* Social proof line */}
            <p className="mt-6 text-xs font-mono" style={{ color: "var(--ink-text-3)", letterSpacing: "0.04em" }}>
              Intake → AI snapshot → 1:1 call → Tailored system delivered
            </p>
          </div>

          {/* Right: product preview */}
          <div className="lg:pt-4 pb-0 flex justify-center lg:justify-end">
            <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <PlanPreview />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="relative h-16 sm:h-24 mt-10"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--canvas))",
        }}
        aria-hidden="true"
      />
    </section>
  );
}
