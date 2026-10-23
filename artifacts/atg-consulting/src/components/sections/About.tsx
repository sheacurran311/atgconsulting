import Link from "@/components/Link";

export default function About() {
  return (
    <section id="about" className="py-20 sm:py-28 bg-white" aria-labelledby="about-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Headshot placeholder */}
          <div className="order-2 md:order-1">
            <div
              className="relative mx-auto md:mx-0 w-64 h-64 sm:w-80 sm:h-80 rounded-3xl bg-navy/5 border-2 border-dashed border-navy/20 flex flex-col items-center justify-center text-center p-6"
              role="img"
              aria-label="Headshot placeholder — replace with photo before launch"
            >
              <svg className="w-16 h-16 text-navy/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-navy/35 text-sm font-medium">[Headshot placeholder]</p>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <p className="section-eyebrow mb-3">About</p>
            <h2 id="about-heading" className="section-heading">Hi, I&apos;m Shea.</h2>
            <div className="mt-5 space-y-4 text-navy/65 leading-relaxed text-lg">
              <p>
                I&apos;m Shea Curran, founder of ATG Consulting and Fandomly.ai, based in Castle Rock, Colorado. I&apos;ve
                spent the last three years building with AI every day, from ChatGPT to Cursor, Replit, Grok Bot, and
                whatever comes out next.
              </p>
              <p>
                Along the way I became the person my family and friends call when they want to know how to actually
                use this stuff. I&apos;ve seen how much time the right workflow saves, and I&apos;ve watched people I love
                skip it because it felt too technical. ATG Consulting is how I close that gap: plain-spoken help, no
                jargon, and a system you&apos;ll actually use.
              </p>
              <p className="text-navy/35 text-base italic">[Optional: one personal line, e.g. what you do outside work]</p>
            </div>
            <Link href="/start" className="btn-primary mt-8 inline-flex">
              Book a free call
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
