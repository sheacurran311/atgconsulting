
const SERVICES = [
  {
    title: "Website & Logo Design",
    marker: "DESIGN + DEVELOPMENT",
    description: "A stronger digital presence that fits your business, not a recycled template. From new logos and brand refreshes to website redesigns, new builds and carefully planned migrations.",
    offerings: ["Website design, redesign & migration", "Logo design & brand refreshes", "Mobile-friendly UX, forms & SEO foundations", "Hosting, launch and handoff"],
  },
  {
    title: "AI Sales & Marketing Workflows",
    marker: "PRACTICAL BUSINESS GROWTH",
    description: "Use sales and business development experience to build repeatable systems, not generic ad-agency promises. AI helps research prospects, organize opportunities and prepare the next step.",
    offerings: ["Lead discovery & qualification workflows", "Personalized outreach drafts", "Customer follow-up & review workflows", "Marketing content planning and reporting"],
  },
  {
    title: "Business Process Automation",
    marker: "LESS REPETITIVE WORK",
    description: "Identify the steps your team repeats and design useful automations inside the tools you control. Configure, test, document and teach the process so it works beyond the first demo.",
    offerings: ["Workflow discovery & process mapping", "Document and admin workflows", "AI assistants and authorized integrations", "Testing, approvals, training and handoff"],
  },
  {
    title: "Personal AI & Productivity",
    marker: "FOR INDIVIDUALS",
    description: "Technology consulting isn't just for businesses. Get practical help with planning, organization, digital routines, personal projects and learning the tools that fit your life.",
    offerings: ["Personal workflow setup", "Planning and organization", "AI tools explained and configured", "Hands-on training"],
  },
  {
    title: "Custom Development",
    marker: "BUILD WHAT YOU NEED",
    description: "When an off-the-shelf tool doesn't solve the problem, we can scope a custom website, web app, integration or mobile project with clear requirements and a realistic delivery plan.",
    offerings: ["Web apps and internal tools", "System integrations", "Mobile app projects when scoped", "Technical discovery and implementation"],
  },
  {
    title: "Fractional Technical Partner",
    marker: "ONGOING SUPPORT",
    description: "A dependable technical partner without hiring an internal development team. Get help with site improvements, workflow adjustments, technical decisions and coordinated maintenance under an agreed scope.",
    offerings: ["Website maintenance and enhancements", "Workflow refinements", "Vendor and software guidance", "Optional ongoing advisory"],
  },
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
            Websites, branding, custom technology, and the AI-powered workflows behind a more efficient operation. Start with one problem or combine services into a complete modernization project.
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
