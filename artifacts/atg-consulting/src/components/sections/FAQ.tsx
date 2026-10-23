"use client";
import { useState } from "react";

const faqs = [
  { q: "Do I need to be technical?", a: "No. If you can use email and a spreadsheet, you can do this. White Glove means you barely touch the setup." },
  { q: "Which AI tools will I use?", a: "Whatever fits you. I'm tool-agnostic and recommend based on your budget, your current tools, and how hands-on you want to be." },
  { q: "Will AI send emails without me?", a: "Not unless you want it to. By default, every message is a draft you review and send." },
  { q: "What does it cost to run afterward?", a: "Most setups run on low-cost subscriptions. I'll give you an estimate before we build: [typical monthly range placeholder]." },
  { q: "Is my data safe?", a: "We use your own accounts and only connect what the workflow needs. You keep ownership and can disconnect anytime." },
  { q: "How fast will I see results?", a: "Most people have a working first workflow within [timeframe placeholder]. Results depend on your market and follow-through." },
  { q: "What if I've already tried ChatGPT?", a: "Great, that's a head start. We'll turn one-off prompts into a repeatable system that actually runs." },
  { q: "Can I upgrade between tiers?", a: "Yes. [Credit policy placeholder, e.g. Self-serve price credited toward Guided]." },
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
        <span
          className="text-sm font-medium transition-colors"
          style={{ color: open ? "var(--blue-btn)" : "var(--canvas-text)" }}
        >
          {q}
        </span>
        <svg
          className="flex-shrink-0 w-4 h-4 transition-transform"
          style={{ color: "var(--canvas-text-3)", transform: open ? "rotate(180deg)" : "none" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
          {a}
        </p>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <section
      id="faq"
      className="py-20 sm:py-28"
      style={{ background: "var(--canvas)" }}
      aria-labelledby="faq-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 id="faq-heading" className="section-heading" style={{ color: "var(--canvas-text)" }}>
            Frequently asked questions
          </h2>
        </div>

        <div
          className="max-w-2xl mx-auto rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}
        >
          <div className="px-6 sm:px-8">
            {faqs.map((f) => <Item key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
