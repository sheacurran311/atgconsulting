import { Link } from "wouter";
export default function CTA() {
  return (
    <section id="cta" className="relative overflow-hidden py-20 sm:py-32" style={{ background: "var(--ink)" }} aria-labelledby="cta-heading">
      <div className="absolute inset-0 bg-dot-dark pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-wide mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="font-mono text-xs font-medium mb-5 uppercase" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>Start with a conversation</p>
        <h2 id="cta-heading" className="display-lg" style={{ color: "var(--ink-text)" }}>
          Let's make your next project <span style={{ color: "var(--blue)" }}>work better.</span>
        </h2>
        <p className="mt-5 text-md max-w-xl mx-auto leading-relaxed" style={{ color: "var(--ink-text-2)" }}>
          A website or logo refresh. AI-powered sales and marketing workflows. Something entirely custom. Tell us what you want to accomplish and we'll determine whether ATG is the right partner.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/intake" className="btn-primary" style={{ fontSize: "15px", padding: "12px 24px" }}>Start your free assessment →</Link>
          <Link to="/intake" className="btn-secondary-white" style={{ fontSize: "15px", padding: "12px 24px" }}>Discuss a project</Link>
        </div>
        <p className="mt-4 text-xs" style={{ color: "var(--ink-text-3)" }}>Initial assessment and short consultation are free. Paid engagements begin only after you review and accept a tailored proposal.</p>
      </div>
    </section>
  );
}
