import { Link } from "wouter";

export default function About() {
  return (
    <section
      id="about"
      className="py-20 sm:py-28"
      style={{ background: "var(--canvas)" }}
      aria-labelledby="about-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-14 items-center">

          {/* Headshot — dark bordered placeholder with dot grid */}
          <div className="order-2 md:order-1 flex justify-center md:justify-start">
            <div
              className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-xl overflow-hidden flex flex-col items-center justify-center bg-dot-light"
              style={{
                background: "var(--canvas-2)",
                border: "1px solid var(--canvas-border)",
              }}
              role="img"
              aria-label="Headshot placeholder — replace with photo before launch"
            >
              <svg className="w-16 h-16 mb-3" style={{ color: "var(--canvas-border)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-mono text-xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.04em" }}>
                [HEADSHOT PLACEHOLDER]
              </span>
            </div>
          </div>

          {/* Bio */}
          <div className="order-1 md:order-2">
            <p className="eyebrow mb-4">About</p>
            <h2 id="about-heading" className="section-heading mb-6" style={{ color: "var(--canvas-text)" }}>
              Hi, I&apos;m Shea.
            </h2>
            <div className="space-y-4 text-base leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
              <p>
                I&apos;m Shea Curran, founder of ATG Consulting and Fandomly.ai, based in Castle Rock, Colorado.
                I&apos;ve spent the last three years building with AI every day — from ChatGPT to Cursor, Replit,
                Grok, and whatever comes out next.
              </p>
              <p>
                Along the way I became the person my family and friends call when they want to know how to
                actually use this stuff. I&apos;ve seen how much time the right workflow saves, and I&apos;ve watched
                people I love skip it because it felt too technical. ATG Consulting is how I close that
                gap: plain-spoken help, no jargon, and a system you&apos;ll actually use.
              </p>
              <p className="text-sm italic" style={{ color: "var(--canvas-text-3)" }}>
                [Optional: one personal line, e.g. what you do outside work]
              </p>
            </div>
            <div className="mt-8">
              <a
                href={typeof window !== "undefined" ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book") : "#book"}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ fontSize: "15px", padding: "12px 22px" }}
              >
                Book a 1:1 with Shea
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
