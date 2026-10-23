/**
 * Services — four workflow "lanes" as before→after strips.
 * Each lane shows the manual steps collapsing into an automated flow.
 * Animation triggers on scroll via IntersectionObserver.
 * Replaces WhatWeAutomate.tsx.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

interface Lane {
  id: string;
  mono: string;
  label: string;
  before: string[];
  after: string;
  tools: string;
}

const LANES: Lane[] = [
  {
    id: "ea",
    mono: "EA",
    label: "Executive assistant",
    before: ["Open email", "Read the inbox", "Decide priority", "Draft replies one by one", "Update calendar", "Send", "Miss things"],
    after: "Drafts flagged for a short review",
    tools: "Gmail · Calendar · Notion",
  },
  {
    id: "sales",
    mono: "SALES",
    label: "Sales",
    before: ["Look for prospects", "Visit each site", "Find a contact", "Open the CRM", "Write the email from scratch", "Send", "Forget to follow up"],
    after: "Personalised drafts and a follow-up queue, ready for you",
    tools: "CRM · Sheets · Email",
  },
  {
    id: "marketing",
    mono: "MKTG",
    label: "Marketing",
    before: ["Stare at a blank doc", "Write one post", "Reformat for LinkedIn", "Reformat for email", "Schedule it by hand", "Start again next week"],
    after: "Posts drafted for your channels, ready to schedule",
    tools: "Docs · Buffer · Sheets",
  },
  {
    id: "cs",
    mono: "CS",
    label: "Customer replies",
    before: ["Open the helpdesk", "Read each ticket", "Search the FAQ", "Write a reply", "Copy it to Slack", "Wait for approval", "Send"],
    after: "Draft replies ready, with anything unusual flagged for you",
    tools: "Helpdesk · Slack · Docs",
  },
];

function Lane({ lane }: { lane: Lane }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [showing, setShowing] = useState(false);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => setShowing(true), reduced ? 0 : 300);
    return () => clearTimeout(id);
  }, [visible, reduced]);

  return (
    <div ref={ref} id={lane.id} className="py-10" style={{ borderBottom: "1px solid var(--canvas-border)" }}>
      <div className="grid lg:grid-cols-[120px_1fr_1fr] gap-6 lg:gap-10 items-start">

        {/* Label column */}
        <div className="flex lg:flex-col gap-3 items-center lg:items-start">
          <span
            className="font-mono text-2xs font-bold px-2 py-1 rounded flex-shrink-0"
            style={{ background: "var(--blue-subtle-lt)", color: "var(--blue-btn)", letterSpacing: "0.1em", border: "1px solid rgba(59,107,255,0.2)" }}
          >
            {lane.mono}
          </span>
          <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
            {lane.label}
          </h3>
        </div>

        {/* Before */}
        <div>
          <p className="font-mono text-2xs mb-3" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
            BEFORE · MANUAL
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lane.before.map((step, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1.5 rounded transition-all"
                style={{
                  background: showing ? "var(--canvas-2)" : "var(--canvas-2)",
                  border: "1px solid var(--canvas-border)",
                  color: showing ? "var(--canvas-text-3)" : "var(--canvas-text-2)",
                  textDecoration: showing ? "line-through" : "none",
                  opacity: showing ? 0.5 : 1,
                  transitionDelay: reduced ? "0ms" : `${i * 60}ms`,
                  transitionDuration: "400ms",
                }}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        {/* After */}
        <div>
          <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>
            AFTER · AUTOMATED
          </p>
          <div
            className="rounded-lg p-4 transition-all"
            style={{
              background: showing ? "rgba(59,107,255,0.06)" : "var(--canvas-2)",
              border: `1px solid ${showing ? "rgba(59,107,255,0.25)" : "var(--canvas-border)"}`,
              transitionDuration: "500ms",
              transitionDelay: reduced ? "0ms" : "200ms",
            }}
          >
            <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>
              {lane.after}
            </p>
            <p className="font-mono text-2xs mt-2" style={{ color: "var(--canvas-text-3)" }}>{lane.tools}</p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--blue)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
              You review the result. Shea can tune it with you, or run it for you.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function Services() {
  return (
    <section
      id="services"
      className="py-16 sm:py-24"
      style={{ background: "var(--canvas)" }}
      aria-labelledby="services-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12" style={{ borderBottom: "1px solid var(--canvas-border)", paddingBottom: "2rem" }}>
          <div>
            <p className="eyebrow mb-3">Four areas</p>
            <h2 id="services-heading" className="section-heading" style={{ color: "var(--canvas-text)" }}>
              Every repetitive task,{" "}
              <span style={{ color: "var(--blue)" }}>automated.</span>
            </h2>
          </div>
          <Link to="/start">
            <span className="btn-primary whitespace-nowrap">Map my workflow →</span>
          </Link>
        </div>

        {/* Lanes */}
        {LANES.map((lane) => <Lane key={lane.id} lane={lane} />)}

        {/* Bottom note */}
        <p className="mt-8 text-xs" style={{ color: "var(--canvas-text-3)" }}>
          Tools shown are examples. Shea uses the tools that fit your existing stack, comfort level, and budget.
          ChatGPT, Claude, Grok, and others can all connect to apps — our edge is a tailored design built for your specific situation.
        </p>
      </div>
    </section>
  );
}
