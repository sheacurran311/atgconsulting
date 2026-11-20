import { Link } from "wouter";

const ENGAGEMENTS = [
  { name: "Start with a Conversation", eyebrow: "FREE FIRST STEP", copy: "Tell us what you want to improve, whether it's a website, logo, lead-generation workflow, business process or personal project. We identify the right next step together.", points: ["Free initial assessment", "Short discovery conversation", "Clear next-step recommendation"], cta: "Start a free assessment" },
  { name: "A Project Built for You", eyebrow: "CUSTOM PROPOSAL", copy: "We scope the work around what you actually need. You receive a reviewed proposal explaining deliverables, costs, timeline, dependencies and what successful completion means.", points: ["Website, branding, AI or combined scope", "Transparent, negotiated project quote", "Agreed milestones, testing and handoff"], cta: "Discuss a project" },
  { name: "A Technical Partner", eyebrow: "ONGOING WHEN NEEDED", copy: "If you want help after the launch, we can separately scope website maintenance, workflow improvements, training or ongoing technical guidance. No automatic care subscription.", points: ["Optional support arrangement", "Defined responsibilities and availability", "Your accounts and tools stay in your control"], cta: "Ask about support" },
] as const;

export default function Tiers() {
  return (
    <section id="tiers" className="py-16 sm:py-24" style={{ background: "var(--canvas-2)", borderTop: "1px solid var(--canvas-border)" }} aria-labelledby="tiers-heading">
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <p className="eyebrow mb-3">How to work with ATG</p>
        <h2 id="tiers-heading" className="section-heading mb-4" style={{ color: "var(--canvas-text)" }}>The right solution. <span style={{ color: "var(--blue)" }}>A clear proposal.</span></h2>
        <p className="text-base max-w-3xl mb-9" style={{ color: "var(--canvas-text-2)" }}>
          Every project is different. We don't ask you to purchase a preset number of sessions or automations before understanding your needs. We'll provide an agreed scope and quote before any paid work begins.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {ENGAGEMENTS.map((item) => (
            <div key={item.name} className="flex flex-col rounded-xl p-6" style={{ background: "var(--canvas-1)", border: "1px solid var(--canvas-border)" }}>
              <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)" }}>{item.eyebrow}</p>
              <h3 className="font-extrabold text-xl mb-3" style={{ color: "var(--canvas-text)" }}>{item.name}</h3>
              <p className="text-sm mb-5" style={{ color: "var(--canvas-text-2)" }}>{item.copy}</p>
              <ul className="space-y-2 flex-1 mb-6">{item.points.map((point) => <li key={point} className="text-xs flex gap-2" style={{ color: "var(--canvas-text-2)" }}><span style={{ color: "var(--blue)" }}>✓</span>{point}</li>)}</ul>
              {item.eyebrow === "FREE FIRST STEP" ? <Link to="/intake" className="btn-primary w-full justify-center text-sm">{item.cta} →</Link> : <a href="mailto:shea@atgconsulting.io?subject=ATG%20Consulting%20Inquiry" className="btn-primary w-full justify-center text-sm">{item.cta} →</a>}
            </div>
          ))}
        </div>
        <p className="text-xs text-center mt-6" style={{ color: "var(--canvas-text-3)" }}>Costs depend on scope, complexity and deliverables. Third-party hosting, software and usage fees are identified in your proposal.</p>
      </div>
    </section>
  );
}
