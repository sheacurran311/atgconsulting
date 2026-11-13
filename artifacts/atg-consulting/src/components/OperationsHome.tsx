import { useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, Check, CalendarDays, BriefcaseBusiness, ShieldCheck, Wrench } from "lucide-react";
import Tiers from "./sections/Tiers";
import Footer from "./sections/Footer";

const journeys = {
  business: { label: "For your business", title: "Keep opportunities moving.", description: "Research, follow-up, meeting preparation, and customer handoffs built around the way your business works.", example: ["A qualified lead arrives", "Research and prepare the next step", "Review the proposed message", "Record the approved action in your tools"] },
  personal: { label: "For your life", title: "Make room for the people who matter.", description: "Bring order to school updates, sports schedules, travel plans, and household deadlines. Keep family information separate from work.", example: ["A tournament schedule changes", "Check dates and calendar conflicts", "Confirm an ambiguous change with you", "Update permitted reminders in your tools"] },
};
const steps = [
  ["01", "Audit your real day", "Tell us what gets missed. We review your assessment and customer-selected examples to understand the actual work."],
  ["02", "Design one useful pilot", "Together we agree the outcome, tools, permissions, costs, and what the system must ask you to approve."],
  ["03", "Install, test, and train", "We configure the agreed workflow in your accounts, test the awkward cases, and teach you how to run, pause, and recover it."],
  ["04", "Measure and maintain", "Compare real effort before and after. Add ongoing care for connection checks, troubleshooting, and agreed improvements."],
];
const faqs = [
  ["Do I need an account to take the assessment?", "No. Enter your email, complete the assessment, and optionally create an account afterward. Verify the same email to link your assessment to the portal."],
  ["Will I get a chatbot or a working system?", "Your scope defines concrete workflows, triggers, actions, and acceptance tests. Self-serve provides a reviewed plan and setup instructions. Guided and Done-for-you help you install and test the system. Downloading an instruction file does not activate automation."],
  ["Where do my AI workflows run?", "In your own AI or automation platforms, using the accounts and permissions you authorize. ATG holds your assessment, deliverables, and reported progress. It does not centrally run your inbox or calendar."],
  ["Can a system act without asking me every time?", "Only for specific routine actions you explicitly authorize in the execution platform. External messages, spending, cancellations, and commitments start with approval. We document the boundaries and test them with you."],
  ["Do I need five agents?", "No. We start with the simplest system that completes the work reliably. Separate roles or agents are added when they improve quality, permissions, or coordination."],
  ["What happens when something breaks?", "Every workflow has a human owner and pause/recovery instructions. Ongoing care can cover connection checks, failed-task recovery, and improvements under an agreed support scope. It is not unlimited or 24/7 unless explicitly contracted."],
  ["Can you help with both work and family life?", "Yes. We can coordinate priorities while keeping family information, work records, and account permissions separate. Begin with either area or both."],
];
export default function OperationsHome() {
  const [audience, setAudience] = useState<"business" | "personal">("business");
  const j = journeys[audience];
  return <main>
    <section className="py-16 sm:py-24" style={{ background: "var(--ink)", color: "var(--ink-text)" }}>
      <div className="max-w-wide mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div style={{ minWidth: 0 }}><p className="font-mono text-xs tracking-widest mb-6" style={{ color: "#A9BFFF" }}>AI AUDITS · PRACTICAL SYSTEMS · ONGOING CARE</p>
          <h1 className="font-extrabold" style={{ fontSize: "clamp(40px, 5.7vw, 72px)", lineHeight: 1.06, letterSpacing: "-0.045em" }}>Your work.<br />Your life.<br /><span style={{ color: "#9CB6FF" }}>A little more handled.</span></h1>
          <p className="text-lg mt-6 mb-7 w-full" style={{ color: "#C6C6CB", lineHeight: 1.7, maxWidth: "100%" }}>We audit the tasks that consume your day, then help you build an AI support team that fits your business and your life.</p>
          <div className="flex flex-wrap gap-3"><Link href="/intake" className="btn-primary">Start my assessment <ArrowUpRight size={18} /></Link><a href="#how-it-works" className="btn-secondary-white">See how it works</a></div>
          <p className="text-sm mt-4" style={{ color: "#B4B4BB" }}>Email first. No account required. Reviewed by Shea.</p>
          <div className="flex flex-wrap gap-5 mt-8 text-sm">{["Your accounts", "Clear approval rules", "A human behind the setup"].map((s) => <span key={s} className="flex gap-2 items-center"><Check size={15} />{s}</span>)}</div>
        </div>
        <div className="rounded-2xl p-5 sm:p-7" style={{ background: "#151518", border: "1px solid #36363E" }}>
          <div className="flex gap-2 mb-7" role="group" aria-label="Explore an example">{Object.entries(journeys).map(([key, value]) => <button key={key} aria-pressed={audience === key} onClick={() => setAudience(key as "business" | "personal")} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ background: audience === key ? "#ECF0FF" : "#25252B", color: audience === key ? "#172B69" : "#D5D5DA" }}>{value.label}</button>)}</div>
          <p className="font-mono text-xs mb-3" style={{ color: "#A9BFFF" }}>ILLUSTRATIVE WORKFLOW · CONFIGURED WITH YOU</p><h2 className="text-2xl font-bold mb-3">{j.title}</h2><p className="text-sm mb-6" style={{ color: "#C6C6CB", lineHeight: 1.7 }}>{j.description}</p>
          <ol className="space-y-3">{j.example.map((s, i) => <li key={s} className="flex gap-3 items-center p-3 rounded-xl" style={{ background: "#202026" }}><span className="font-mono text-xs" style={{ color: "#A9BFFF" }}>0{i + 1}</span><span className="text-sm">{s}</span></li>)}</ol>
          <p className="text-xs mt-5" style={{ color: "#B4B4BB" }}>Example, not a live activity feed. Actions depend on your tools, permissions, and agreed scope.</p>
        </div>
      </div>
    </section>
    <section id="services" className="py-16 sm:py-24" style={{ background: "var(--canvas)", color: "var(--canvas-text)" }}><div className="max-w-wide mx-auto px-5 sm:px-8">
      <p className="eyebrow mb-3">Start with the outcome</p><h2 className="section-heading mb-4">Help where the work piles up.</h2><p className="text-lg max-w-2xl mb-9">One brand. Two places to make life easier. A practical process from audit to a tested pilot.</p>
      <div className="grid md:grid-cols-3 gap-5">{[
        { icon: BriefcaseBusiness, name: "Business operations", text: "Prospect research, follow-up, meeting preparation, proposals, and customer handoffs.", result: "A clear process that moves work forward.", url: "/intake?audience=business" },
        { icon: CalendarDays, name: "Personal & family operations", text: "School and sports updates, calendar conflicts, trip preparation, and household deadlines.", result: "A coordinated plan with fewer loose ends.", url: "/intake?audience=personal" },
        { icon: Wrench, name: "Managed AI care", text: "Agreed connection checks, troubleshooting, instruction updates, cost reviews, and small improvements.", result: "Someone accountable for keeping your setup useful.", url: "/intake?audience=both" },
      ].map((o) => <article key={o.name} className="rounded-2xl p-6 flex flex-col" style={{ background: "white", border: "1px solid var(--canvas-border)" }}><o.icon className="mb-5" style={{ color: "var(--blue-btn)" }} size={28} /><h3 className="text-xl font-bold mb-3">{o.name}</h3><p className="text-sm mb-4 flex-1 leading-relaxed">{o.text}</p><p className="text-sm font-semibold mb-6">{o.result}</p><Link href={o.url} className="font-semibold text-sm" style={{ color: "var(--blue-btn)" }}>Explore my fit →</Link></article>)}</div>
    </div></section>
    <section id="how-it-works" className="py-16" style={{ background: "var(--canvas-2)", color: "var(--canvas-text)" }}><div className="max-w-wide mx-auto px-5 sm:px-8"><p className="eyebrow mb-3">The ATG delivery process</p><h2 className="section-heading mb-9">Useful first. Expand from there.</h2><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-7">{steps.map(([n, title, text]) => <article key={n}><p className="font-mono mb-4" style={{ color: "var(--blue-btn)" }}>{n}</p><h3 className="font-bold text-lg mb-3">{title}</h3><p className="text-sm leading-relaxed">{text}</p></article>)}</div></div></section>
    <section className="py-16 sm:py-24" style={{ background: "var(--canvas)", color: "var(--canvas-text)" }}><div className="max-w-wide mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12"><div><p className="eyebrow mb-3">Your deliverables</p><h2 className="section-heading mb-5">Know what you're getting.<br />Keep what we build.</h2><p className="leading-relaxed mb-5">Your reviewed operating guide connects the audit to the actual setup. It explains the job, the boundaries, how to test it, and what to do when it needs help.</p><div className="flex gap-3 p-4 rounded-xl" style={{ background: "var(--canvas-2)" }}><ShieldCheck size={28} className="shrink-0" /><p className="text-sm">You own the accounts and control access. Personal and business information stay separate. ATG tracks the plan and reported evidence.</p></div></div><ul className="space-y-4">{["An audit of priorities, constraints, and current effort", "A prioritized pilot scope with setup and recurring costs", "Workflow roles, triggers, permissions, and human owners", "Installation testing and a customer acceptance checklist", "A portable operating guide and workflow setup briefs", "A thirty-day review and clearly scoped care options"].map((s) => <li key={s} className="flex gap-3 pb-4 border-b" style={{ borderColor: "var(--canvas-border)" }}><Check size={19} className="shrink-0 mt-1" style={{ color: "var(--blue-btn)" }} /><span>{s}</span></li>)}<li className="text-sm">Installation and hands-on delivery depend on your service tier and agreed scope.</li></ul></div></section>
    <Tiers />
    <section id="about" className="py-16" style={{ background: "var(--ink)", color: "var(--ink-text)" }}><div className="max-w-wide mx-auto px-5 sm:px-8 grid md:grid-cols-2 gap-10"><div><p className="font-mono text-xs mb-4" style={{ color: "#A9BFFF" }}>SHEA · ATG CONSULTING · COLORADO</p><h2 className="section-heading">A human who understands the work.</h2></div><div><p className="leading-relaxed mb-5" style={{ color: "#D5D5DA" }}>Shea reviews your situation, helps you choose a practical first project, and guides the setup around your tools and comfort level. The goal is a system you can understand, control, and keep using.</p><Link href="/intake" className="btn-primary">Tell me what needs handling <ArrowUpRight size={18} /></Link></div></div></section>
    <section id="faq" className="py-16" style={{ background: "var(--canvas)", color: "var(--canvas-text)" }}><div className="max-w-3xl mx-auto px-5"><h2 className="section-heading mb-8">Before we get started.</h2>{faqs.map(([q, a]) => <details key={q} className="border-b py-5" style={{ borderColor: "var(--canvas-border)" }}><summary className="font-semibold cursor-pointer pr-3">{q}</summary><p className="text-sm mt-3 leading-relaxed">{a}</p></details>)}</div></section>
    <Footer />
  </main>;
}
