import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import LogoMark from "@/components/LogoMark";

const EXAMPLES = [
  { label: "Website & brand", title: "Make a stronger first impression", description: "A modern website and visual identity designed around your customers, content, and business goals.", steps: ["Review the existing site and customer journey", "Define design, content and migration scope", "Build, test and launch with a clear handoff"] },
  { label: "Sales & marketing", title: "Make your follow-up repeatable", description: "AI-assisted lead research, prospect qualification, outreach drafts and approval-controlled follow-up in your own tools.", steps: ["Map where opportunities come from", "Configure the right workflow and safeguards", "Test with examples before activating it"] },
  { label: "Personal workflows", title: "Make everyday technology useful", description: "Practical systems for planning, personal organization and repetitive tasks, configured with your permission.", steps: ["Identify the recurring pain points", "Choose tools that fit your routine", "Learn to adjust, pause or improve the setup"] },
] as const;

export default function Hero() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="relative overflow-hidden" style={{ background: "var(--ink)" }} aria-labelledby="hero-heading">
      <div className="absolute inset-0 bg-dot-dark pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-wide mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="flex flex-wrap items-center gap-3 mb-9">
          <LogoMark variant="dark" size={19} aria-hidden blink />
          <span className="font-mono text-2xs" style={{ color: "var(--ink-text-3)", letterSpacing: "0.08em" }}>ATG CONSULTING · CASTLE ROCK, COLORADO</span>
          <span className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>LOCAL ROOTS · NATIONWIDE REACH</span>
        </div>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div initial={reducedMotion ? false : { opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: "easeOut" }}>
            <p className="font-mono text-xs mb-5 uppercase" style={{ color: "var(--blue)", letterSpacing: "0.12em" }}>Websites · Design · AI · Automation</p>
            <h1 id="hero-heading" className="display-xl mb-6" style={{ color: "var(--ink-text)" }}>
              Your business. <span style={{ color: "var(--blue)" }}>Modernized.</span>
            </h1>
            <p className="text-lg leading-relaxed mb-5" style={{ color: "var(--ink-text-2)", maxWidth: "570px" }}>
              Better websites, sharper branding, and practical AI-powered workflows. ATG helps businesses and individuals design, build, and use technology that makes everyday work easier.
            </p>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--ink-text-2)", maxWidth: "550px" }}>
              Don't just ask AI what to do. Put it to work, with hands-on consulting, carefully configured tools, and a clear path from idea to implementation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/intake" className="btn-primary" style={{ fontSize: "15px", padding: "12px 22px" }}>Start a free assessment →</Link>
              <a href="mailto:shea@atgconsulting.io?subject=ATG%20Project%20Inquiry" className="btn-secondary-white" style={{ fontSize: "15px", padding: "12px 22px" }}>Discuss your project</a>
            </div>
            <p className="text-xs mt-5" style={{ color: "var(--ink-text-3)" }}>
              Free initial consultation · Tailored proposals · No predetermined packages
            </p>
          </motion.div>
          <motion.div initial={reducedMotion ? false : { opacity: 0, x: 44, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.85, delay: 0.15, ease: "easeOut" }} className="rounded-xl overflow-hidden" style={{ background: "var(--ink-1)", border: "1px solid var(--ink-border)" }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ background: "var(--ink-2)", borderBottom: "1px solid var(--ink-border)" }}>
              <span className="font-mono text-2xs" style={{ color: "var(--ink-text-3)" }}>WHAT WE CAN BUILD TOGETHER</span>
              <span className="font-mono text-2xs" style={{ color: "var(--blue)" }}>EXAMPLES</span>
            </div>
            <div className="p-5 sm:p-6 space-y-5">
              {EXAMPLES.map((example) => (
                <div key={example.label} className="rounded-lg p-4" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-border)" }}>
                  <span className="font-mono text-2xs uppercase" style={{ color: "var(--blue)" }}>{example.label}</span>
                  <h2 className="text-base font-extrabold mt-1 mb-1" style={{ color: "var(--ink-text)" }}>{example.title}</h2>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--ink-text-2)" }}>{example.description}</p>
                  <ul className="mt-3 space-y-1">
                    {example.steps.map((step) => <li key={step} className="text-xs" style={{ color: "var(--ink-text-3)" }}>› {step}</li>)}
                  </ul>
                </div>
              ))}
              <p className="text-xs" style={{ color: "var(--ink-text-3)" }}>Every engagement is scoped to your needs. Your accounts, permissions, and approvals stay under your control.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
