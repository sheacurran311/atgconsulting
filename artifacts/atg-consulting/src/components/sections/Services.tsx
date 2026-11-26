import { motion, useReducedMotion } from "framer-motion";

const SERVICES = [
  {
    "title": "AI Strategy & Advisory",
    "marker": "STRATEGIC DIRECTION",
    "description": "Assess readiness, prioritize opportunities and establish a practical AI roadmap. Fractional AI leadership provides ongoing strategic guidance within an agreed scope.",
    "offerings": [
      "AI readiness and opportunity assessment",
      "Transformation roadmap and ROI analysis",
      "Fractional AI leadership",
      "Technology and vendor advisory"
    ]
  },
  {
    "title": "AI Automation & Agents",
    "marker": "INTELLIGENT OPERATIONS",
    "description": "Design and test repeatable workflows and bounded AI agents using approved business information, tools and review controls. Voice AI is scoped as an inbound pilot before production use.",
    "offerings": [
      "Workflow and context engineering",
      "Agentic automation and integrations",
      "Sales, prospecting and follow-up workflows",
      "Inbound voice AI pilot evaluation"
    ]
  },
  {
    "title": "Digital Transformation & Growth",
    "marker": "DESIGN + DEVELOPMENT",
    "description": "Modernize the entire digital customer journey, from discoverability and design to customer intake, internal systems and operational reporting.",
    "offerings": [
      "Website design, redesign, migration and branding",
      "SEO/AEO and marketing workflows",
      "Custom applications and internal tools",
      "Customer intake and connected systems"
    ]
  },
  {
    "title": "Knowledge, Training & Governance",
    "marker": "SAFE AI ADOPTION",
    "description": "Make business knowledge accessible to the right people and equip your team to operate AI responsibly.",
    "offerings": [
      "Business knowledge management and AI assistants",
      "Role-specific employee training",
      "AI policies and permissions",
      "Testing, documentation and handoff"
    ]
  },
  {
    "title": "Managed AI & Optimization",
    "marker": "ONGOING IMPROVEMENT",
    "description": "Maintain agreed implementations, measure performance and identify improvements under a defined support agreement.",
    "offerings": [
      "Workflow health and performance reviews",
      "Cost and reliability optimization",
      "Website and SEO/AEO care",
      "Recurring reporting and support"
    ]
  },
  {
    "title": "Personal AI & Productivity",
    "marker": "FOR INDIVIDUALS",
    "description": "Get practical help with planning, organization, digital routines, personal projects and learning the tools that fit your life.",
    "offerings": [
      "Personal workflow setup",
      "Planning and organization",
      "AI tools explained and configured",
      "Hands-on training"
    ]
  }
] as const;

export default function Services() {
  const reducedMotion = useReducedMotion();
  return (
    <section id="services" className="section-pad" style={{ background: "var(--canvas-1)" }} aria-labelledby="services-heading">
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-11">
          <p className="eyebrow mb-3">What ATG can do for you</p>
          <h2 id="services-heading" className="display-lg mb-4" style={{ color: "var(--canvas-text)" }}>Real solutions, <span style={{ color: "var(--blue)" }}>not another subscription.</span></h2>
          <p className="text-base leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
            Five connected business service areas, plus personal technology consulting. Start with one problem or combine strategic advisory, implementation and ongoing optimization into a tailored engagement.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((service, index) => (
            <motion.article key={service.title} initial={reducedMotion ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.52, delay: reducedMotion ? 0 : (index % 3) * 0.1 }} className="rounded-xl p-6 flex flex-col" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas)" }}>
              <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>{service.marker}</p>
              <h3 className="font-extrabold text-xl mb-3" style={{ color: "var(--canvas-text)" }}>{service.title}</h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--canvas-text-2)" }}>{service.description}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {service.offerings.map((offering) => (
                  <li key={offering} className="text-xs flex gap-2" style={{ color: "var(--canvas-text-2)" }}><span style={{ color: "var(--blue)" }}>✓</span>{offering}</li>
                ))}
              </ul>
              <a href={`mailto:shea@atgconsulting.io?subject=${encodeURIComponent(`ATG Inquiry: ${service.title}`)}`} className="text-sm font-semibold" style={{ color: "var(--blue)" }}>Discuss this service →</a>
            </motion.article>
          ))}
        </div>
        <div className="rounded-xl mt-6 p-6 sm:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center" style={{ background: "var(--ink)", border: "1px solid var(--ink-border)" }}>
          <div>
            <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)" }}>BESPOKE ENGAGEMENTS</p>
            <h3 className="font-extrabold text-xl mb-2" style={{ color: "var(--ink-text)" }}>Complete Business Modernization</h3>
            <p className="text-sm" style={{ color: "var(--ink-text-2)" }}>A new website and brand, smarter sales and marketing workflows, practical AI automation, and a technical partner to bring it together. Every project is tailored to your goals and budget.</p>
          </div>
          <a href="mailto:shea@atgconsulting.io?subject=Complete%20Business%20Modernization%20Inquiry" className="btn-primary">Discuss a full-service project →</a>
        </div>
        <p className="text-xs mt-5" style={{ color: "var(--canvas-text-3)" }}>ATG does not manage advertising placements or operate your customer communications on ATG servers. Your systems remain yours, with appropriate review and approval controls.</p>
      </div>
    </section>
  );
}
