"use client";
import { useState } from "react";

const faqs = [
  {
    q: "Do I need to know anything about AI or software?",
    a: "No. If you can use email, you can use ATG. Shea handles the technical parts. You review what comes out.",
  },
  {
    q: "What is the Self-serve tier?",
    a: "You get a personalised tool plan — which software to use for your specific business, why, and a step-by-step guide for setting it up. You also get access to ready-made workflows in the app, and email support with replies within 2 business days. No 1:1 calls.",
  },
  {
    q: "What does the Guided tier include?",
    a: "A package of 1:1 build sessions with Shea. You and Shea design and set up your workflows together on live video calls. The number of sessions depends on your package. Includes everything in Self-serve plus a direct message thread with Shea.",
  },
  {
    q: "What is Done-for-you?",
    a: "Shea designs, builds, runs, and tunes up to 3 custom workflows for your business. You approve what comes out — Shea handles the rest. This tier is by application because it requires Shea's ongoing time. Spots are very limited. It's also available as an upgrade after Guided.",
  },
  {
    q: "Will AI send emails or post anything for me?",
    a: "Not without your sign-off. Every output — a draft email, a social post, a follow-up — lands in your inbox for you to review, copy, and send yourself. Nothing is sent automatically.",
  },
  {
    q: "What tools will I need?",
    a: "Whatever fits your business. Shea recommends based on what you already use, your budget, and your specific workflow. The Self-serve plan includes a full tool recommendation with cost notes.",
  },
  {
    q: "What does it cost to run the tools afterward?",
    a: "Most setups use tools with free tiers or low-cost plans. Shea includes a cost note for each recommendation — always check current pricing on the provider's website. ATG never charges for tool use directly.",
  },
  {
    q: "How quickly will I see results?",
    a: "The first workflow (a follow-up draft) is available to try in the app right away. A tailored tool plan or custom workflow takes longer — Shea will give you a timeline based on your situation.",
  },
  {
    q: "Can I upgrade between tiers?",
    a: "Yes. [Upgrade credit policy — to be set by Shea.] Done-for-you is also offered as an upgrade after completing Guided.",
  },
  {
    q: "Is my data safe?",
    a: "Your intake answers are stored securely and visible only to you and Shea in the admin console. When generating your plan or drafts, the text you enter can be sent to the configured AI provider (OpenAI-compatible). See the Privacy page for full details.",
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
