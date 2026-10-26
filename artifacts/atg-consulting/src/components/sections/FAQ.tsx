"use client";
import { useState } from "react";

const faqs = [
  {
    q: "Do I need to know anything about AI or software?",
    a: "No. If you can use email, you can use ATG. Shea handles all the technical setup. You review what comes out and decide what to send.",
  },
  {
    q: "What is the Self-serve tier?",
    a: "You get a personalised tool plan — which software to use for your business, why, and a step-by-step guide to set it up. You also get access to ready-made workflows in the ATG Workbench app and email support within 2 business days. No calls.",
  },
  {
    q: "What does the Guided tier include?",
    a: "A package of 1:1 build sessions with Shea. You and Shea design and build your workflows together on live calls. Sessions are recorded with your consent so you get a recap. Includes everything in Self-serve plus a direct message thread with Shea.",
  },
  {
    q: "What is Done-for-you?",
    a: "Shea designs, builds, runs, and tunes up to 3 custom workflows for your specific business. You approve what comes out — Shea handles everything else. By application only because it requires Shea's ongoing time. Limited spots; a waitlist opens when full.",
  },
  {
    q: "Will anything be sent automatically on my behalf?",
    a: "No. Every output — a draft email, a social post, a follow-up message — lands in your Workbench inbox for you to review and approve. Nothing leaves your system without your say.",
  },
  {
    q: "Can I take my workflows somewhere else?",
    a: "Yes. Any workflow Shea builds can be exported as a SKILL.md file and run inside Grok Bot, Claude, or any other AI tool you already subscribe to. You're not locked in to any ATG platform. ChatGPT, Claude, and Grok can all connect to apps — ATG's value is designing and running the right ones for you.",
  },
  {
    q: "What tools will I need?",
    a: "Whatever already fits your business. Shea recommends based on what you currently use, your budget, and your specific workflow. The Self-serve plan includes a full tool recommendation with cost notes for each.",
  },
  {
    q: "What does it cost to run the tools?",
    a: "Most setups use free tiers or low-cost subscriptions. Shea includes a cost estimate per recommendation — always verify current pricing on the provider's site. You pay the providers directly; ATG doesn't mark up tool costs.",
  },
  {
    q: "How quickly will I see results?",
    a: "The lead follow-up and inbox triage workflows are available to try right away in the app. A personalised tool plan or custom workflow takes longer — Shea gives you a timeline based on your specific situation.",
  },
  {
    q: "Can I upgrade between tiers?",
    a: "Yes. [Upgrade and credit policy — to be set by Shea.] Done-for-you is also offered as an upgrade after completing Guided.",
  },
  {
    q: "Is my data safe?",
    a: "Your intake answers are stored securely and visible only to you and Shea in the admin console. When generating plans or drafts, the relevant text is sent to the configured AI provider (OpenAI-compatible). See the Privacy page for full details.",
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--canvas-border)" }}>
      <button
        className="w-full flex items-center justify-between py-4 text-left gap-4 group"
        style={{ background: "none", border: "none", cursor: "pointer" }}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-sm font-medium transition-colors" style={{ color: open ? "var(--blue-btn)" : "var(--canvas-text)" }}>{q}</span>
        <svg
          className="flex-shrink-0 w-4 h-4 transition-transform"
          style={{ color: "var(--canvas-text-3)", transform: open ? "rotate(180deg)" : "none" }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>{a}</p>}
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="py-16 sm:py-24" style={{ background: "var(--canvas)" }} aria-labelledby="faq-heading">
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 id="faq-heading" className="section-heading" style={{ color: "var(--canvas-text)" }}>Frequently asked questions</h2>
        </div>
        <div className="max-w-2xl mx-auto rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
          <div className="px-6 sm:px-8">
            {faqs.map((f) => <Item key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
