"use client";
import { useState } from "react";

const faqs = [
  { q: "How much does ATG Consulting cost?", a: "There is no one-size-fits-all price. A logo refresh, website migration, and multi-system AI implementation all require different work. After reviewing your needs and speaking with you, ATG provides a tailored proposal with the deliverables, timeline, total project fee, and payment terms. Nothing is charged simply for requesting a proposal." },
  { q: "Is the initial assessment and consultation free?", a: "Yes. The initial assessment and short discovery conversation are free, without an obligation to purchase. Complex technical audits or extensive project scoping may be offered separately with a clear quote before the paid work begins." },
  { q: "Can you redesign my website or logo without selling me AI?", a: "Absolutely. Website design, redesign, logo creation, branding, hosting evaluation and migration can be standalone projects. We'll recommend retaining your existing platform if it still meets your needs. AI isn't a mandatory add-on." },
  { q: "What kind of sales and marketing work do you provide?", a: "We help configure AI-assisted prospect research, lead qualification, outreach drafting, customer follow-up, marketing planning and reporting workflows. ATG isn't a traditional advertising agency and does not automatically buy or operate paid ad campaigns." },
  { q: "Can you build custom software?", a: "Yes, when the requirements and delivery scope are a good fit. That can include websites, web applications, integrations, internal tools and selectively scoped mobile projects. We'll identify dependencies and limitations during discovery." },
  { q: "Can you help individuals and households?", a: "Yes. ATG also helps with personal AI tools, productivity, organization, scheduling workflows and hands-on technology training. The assessment can begin with a personal goal rather than a company." },
  { q: "Will AI send messages or access my accounts without asking?", a: "No. We agree on permissions and approval steps before configuring an automation in systems you control. Some low-risk tasks can run automatically once authorized; sensitive communications and consequential actions can require your review. ATG does not operate customer inboxes, calendars or messages from its own servers." },
  { q: "Will you teach me how to manage what you build?", a: "Yes. Every implementation proposal defines the testing, documentation, training and handoff included. You'll be able to review the workflow and understand how to adjust or pause it. Optional ongoing support can be scoped separately." },
  { q: "Are hosting, software, and AI subscriptions included?", a: "Your proposal explains expected third-party expenses, which accounts belong to you, and any software or usage fees not included in ATG's professional fee. We won't imply that an external service is free or included without confirming it." },
  { q: "Where do you work?", a: "ATG is based in Castle Rock, Colorado and works with businesses and individuals in the surrounding region and across the United States through remote consultations and project delivery." },
  { q: "How do refunds or changes to scope work?", a: "A written proposal and its applicable agreement will describe the payment schedule, change orders, cancellation, and refund terms before any paid engagement starts. Existing published legal terms should be reviewed alongside those terms before accepting a proposal." },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--canvas-border)" }}>
      <button type="button" className="w-full flex items-center justify-between py-4 text-left gap-4 group" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="text-sm font-medium" style={{ color: open ? "var(--blue-btn)" : "var(--canvas-text)" }}>{q}</span>
        <svg className="flex-shrink-0 w-4 h-4 transition-transform" style={{ color: "var(--canvas-text-3)", transform: open ? "rotate(180deg)" : "none" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>{a}</p>}
    </div>
  );
}
export default function FAQ() {
  return (
    <section id="faq" className="py-16 sm:py-24" style={{ background: "var(--canvas)" }} aria-labelledby="faq-heading">
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12"><p className="eyebrow mb-3">Pricing and practical questions</p><h2 id="faq-heading" className="section-heading" style={{ color: "var(--canvas-text)" }}>How much does this cost?</h2></div>
        <div className="max-w-2xl mx-auto rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}><div className="px-6 sm:px-8">{faqs.map(f => <Item key={f.q} q={f.q} a={f.a} />)}</div></div>
      </div>
    </section>
  );
}
