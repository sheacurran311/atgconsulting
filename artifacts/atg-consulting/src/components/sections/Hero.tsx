/**
 * Hero — "The workflow is the interface."
 * Visitor picks a problem → animated node-based workflow draws in → mono run log ticks.
 * Mobile: vertical stepper instead of canvas.
 * Respects prefers-reduced-motion (disables draw animations, runs log instantly).
 */
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import LogoMark from "@/components/LogoMark";

// ── Workflow data ─────────────────────────────────────────────────────────────

type ProblemKey = "inbox" | "leads" | "content" | "customers";

interface WorkflowNode { id: string; type: "trigger" | "ai" | "tool" | "output"; label: string }
interface WorkflowDef {
  label: string;
  sublabel: string;
  nodes: WorkflowNode[];
  log: string[];
}

const WORKFLOWS: Record<ProblemKey, WorkflowDef> = {
  inbox: {
    label: "My inbox runs my day",
    sublabel: "EA · Inbox & calendar",
    nodes: [
      { id: "t", type: "trigger", label: "Email arrives" },
      { id: "a", type: "ai",      label: "AI classifies & drafts reply" },
      { id: "o", type: "tool",    label: "Gmail · Calendar" },
      { id: "r", type: "output",  label: "3 drafts ready for review" },
    ],
    log: [
      "scanning 47 unread emails",
      "12 flagged as action-required",
      "8 newsletters auto-archived",
      "3 draft replies prepared",
      "2 calendar blocks suggested",
      "ready for your 5-min review",
    ],
  },
  leads: {
    label: "Good leads go cold",
    sublabel: "Sales · Prospecting & follow-up",
    nodes: [
      { id: "t", type: "trigger", label: "Weekly prospect run" },
      { id: "a", type: "ai",      label: "AI researches & drafts outreach" },
      { id: "o", type: "tool",    label: "CRM · Sheets" },
      { id: "r", type: "output",  label: "8 personalised drafts ready" },
    ],
    log: [
      "building prospect list",
      "8 new accounts found in territory",
      "contact research pulled for each",
      "8 first-touch emails drafted",
      "4 follow-up nudges queued",
      "all touches logged to CRM",
    ],
  },
  content: {
    label: "Content takes forever",
    sublabel: "Marketing · Content & campaigns",
    nodes: [
      { id: "t", type: "trigger", label: "This week's brief" },
      { id: "a", type: "ai",      label: "AI drafts & schedules posts" },
      { id: "o", type: "tool",    label: "Docs · Buffer · Sheets" },
      { id: "r", type: "output",  label: "12 posts across 3 platforms" },
    ],
    log: [
      "repurposing last week's post",
      "5 LinkedIn drafts written",
      "4 short-form videos outlined",
      "3 email newsletter snippets done",
      "scheduled across the week",
      "performance tracker updated",
    ],
  },
  customers: {
    label: "Customers wait on replies",
    sublabel: "Support · Triage & response",
    nodes: [
      { id: "t", type: "trigger", label: "Support inbox scan" },
      { id: "a", type: "ai",      label: "AI triages & drafts responses" },
      { id: "o", type: "tool",    label: "Helpdesk · Slack" },
      { id: "r", type: "output",  label: "14 drafts, 3 escalations flagged" },
    ],
    log: [
      "14 tickets scanned",
      "3 high-priority flagged",
      "11 routine responses drafted",
      "FAQ matches found for each",
      "team notified of escalations",
      "ready for 5-min review",
    ],
  },
};

const PROBLEMS: { key: ProblemKey; label: string }[] = [
  { key: "inbox",    label: "My inbox runs my day" },
  { key: "leads",    label: "Good leads go cold" },
  { key: "content",  label: "Content takes forever" },
  { key: "customers",label: "Customers wait on replies" },
];

// ── Node type colours ─────────────────────────────────────────────────────────
const NODE_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  trigger: { bg: "var(--ink-2)", border: "var(--ink-border)", text: "var(--ink-text-2)" },
  ai:      { bg: "rgba(59,107,255,0.12)", border: "rgba(59,107,255,0.4)", text: "var(--ink-text)" },
  tool:    { bg: "var(--ink-2)", border: "var(--ink-border)", text: "var(--ink-text-3)" },
  output:  { bg: "rgba(59,107,255,0.08)", border: "rgba(59,107,255,0.25)", text: "var(--ink-text)" },
};

// ── Run log ───────────────────────────────────────────────────────────────────
function useRunLog(lines: string[], active: boolean) {
  const [visible, setVisible] = useState<string[]>([]);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    setVisible([]);
    if (!active) return;
    if (reduced) { setVisible(lines.map((l) => `→ ${l}`)); return; }
    let i = 0;
    const id = setInterval(() => {
      if (i < lines.length) { setVisible((v) => [...v, `→ ${lines[i]!}`]); i++; }
      else clearInterval(id);
    }, 380);
    return () => clearInterval(id);
  }, [lines, active, reduced]);

  return visible;
}

// ── Workflow canvas ───────────────────────────────────────────────────────────
function WorkflowCanvas({ workflow, animate }: { workflow: WorkflowDef; animate: boolean }) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const log = useRunLog(workflow.log, animate);
  const [shownNodes, setShownNodes] = useState<number>(0);

  useEffect(() => {
    setShownNodes(0);
    if (!animate) return;
    if (reduced) { setShownNodes(workflow.nodes.length); return; }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShownNodes(i);
      if (i >= workflow.nodes.length) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [workflow, animate, reduced]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Node graph — desktop horizontal, mobile vertical */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 min-h-[88px]">
        {workflow.nodes.map((node, i) => {
          const style = NODE_STYLE[node.type] ?? NODE_STYLE.trigger!;
          const visible = i < shownNodes;
          return (
            <div key={node.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-0">
              {/* Connector arrow (desktop) */}
              {i > 0 && (
                <div
                  className="hidden sm:flex items-center mx-1 transition-opacity"
                  style={{ opacity: visible ? 1 : 0, transitionDuration: "300ms" }}
                  aria-hidden="true"
                >
                  <div className="w-6 h-px" style={{ background: "var(--blue)", opacity: 0.4 }} />
                  <span className="font-mono text-2xs ml-0.5" style={{ color: "var(--blue)", opacity: 0.6 }}>›</span>
                </div>
              )}
              {/* Connector arrow (mobile) */}
              {i > 0 && (
                <div className="sm:hidden ml-4 my-0.5 flex items-center" style={{ opacity: visible ? 1 : 0 }} aria-hidden="true">
                  <span className="font-mono text-xs" style={{ color: "var(--blue)", opacity: 0.5 }}>↓</span>
                </div>
              )}
              {/* Node */}
              <div
                className="rounded-lg px-3 py-2 transition-all"
                style={{
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "none" : "translateY(6px)",
                  transitionDuration: "280ms",
                  transitionTimingFunction: "cubic-bezier(0.2,0,0,1)",
                  minWidth: "100px",
                }}
              >
                <p className="font-mono text-2xs mb-0.5" style={{ color: "var(--blue)", opacity: 0.7, letterSpacing: "0.06em" }}>
                  {node.type.toUpperCase()}
                </p>
                <p className="text-sm font-medium" style={{ color: style.text, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                  {node.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Run log */}
      <div
        className="flex-1 rounded-lg p-3 font-mono text-xs overflow-hidden"
        style={{ background: "var(--ink-3)", border: "1px solid var(--ink-border)", minHeight: "120px" }}
      >
        <p className="mb-2 opacity-50" style={{ color: "var(--blue)", letterSpacing: "0.06em", fontSize: "10px" }}>
          EXAMPLE RUN · NOT REAL DATA
        </p>
        <div className="space-y-1">
          {log.map((line, i) => (
            <p key={i} className="leading-relaxed" style={{ color: "var(--ink-text-2)" }}>
              <span style={{ color: "var(--blue)", marginRight: "4px" }}>›</span>
              {line.replace("→ ", "")}
            </p>
          ))}
          {animate && log.length < workflow.log.length && !reduced && (
            <p className="logo-cursor-blink" style={{ color: "var(--blue)" }}>█</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main hero ─────────────────────────────────────────────────────────────────
export default function Hero() {
  const [active, setActive] = useState<ProblemKey>("inbox");
  const [animated, setAnimated] = useState(false);
  const bookingUrl = typeof window !== "undefined"
    ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book")
    : "#book";

  useEffect(() => {
    setAnimated(false);
    const id = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(id);
  }, [active]);

  // Auto-cycle on first load
  useEffect(() => {
    setAnimated(true);
    const keys: ProblemKey[] = ["inbox", "leads", "content", "customers"];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % keys.length;
      setActive(keys[i]!);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  const workflow = WORKFLOWS[active]!;

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--ink)", minHeight: "92vh" }}
      aria-labelledby="hero-heading"
    >
      {/* Dot grid */}
      <div className="absolute inset-0 bg-dot-dark pointer-events-none" aria-hidden="true" />
      {/* Blue radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,107,255,0.07) 0%, transparent 70%)" }} aria-hidden="true" />

      <div className="relative max-w-wide mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16">
        {/* Top annotation */}
        <div className="flex items-center gap-3 mb-8">
          <LogoMark variant="dark" size={20} aria-hidden blink />
          <span className="font-mono text-2xs" style={{ color: "var(--ink-text-3)", letterSpacing: "0.08em" }}>
            ATG CONSULTING · CO · USA
          </span>
          <span className="w-px h-3" style={{ background: "var(--ink-border)" }} aria-hidden="true" />
          <span className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>
            DONE-FOR-YOU AI WORKFLOWS
          </span>
        </div>

        {/* Headline */}
        <h1
          id="hero-heading"
          className="display-xl mb-5"
          style={{ color: "var(--ink-text)", maxWidth: "760px" }}
        >
          We build the AI workflows.{" "}
          <span style={{ color: "var(--blue)" }}>You get the hours back.</span>
        </h1>

        <p className="text-md leading-relaxed mb-10 max-w-xl" style={{ color: "var(--ink-text-2)" }}>
          Shea designs and runs AI systems tailored to your role, clients, and daily
          life — across executive assistance, marketing, sales, and customer support.
          Human-led, done for you.
        </p>

        {/* Layout: picker left, demo right */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">

          {/* Problem picker */}
          <div>
            <p className="font-mono text-2xs mb-3" style={{ color: "var(--ink-text-3)", letterSpacing: "0.08em" }}>
              PICK A SITUATION
            </p>
            <div className="flex flex-col gap-2">
              {PROBLEMS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setActive(p.key)}
                  className="text-left px-4 py-3 rounded-lg transition-all"
                  style={{
                    background: active === p.key ? "var(--ink-2)" : "transparent",
                    border: `1px solid ${active === p.key ? "var(--blue)" : "var(--ink-border)"}`,
                    color: active === p.key ? "var(--ink-text)" : "var(--ink-text-2)",
                    boxShadow: active === p.key ? "0 0 0 1px rgba(59,107,255,0.1)" : "none",
                    transitionDuration: "150ms",
                  }}
                >
                  <span className="text-sm font-medium leading-tight" style={{ letterSpacing: "-0.01em" }}>
                    {p.label}
                  </span>
                </button>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-col gap-2">
              <Link to="/start">
                <span className="btn-primary w-full justify-center">Map my workflow →</span>
              </Link>
              <a
                href={bookingUrl}
                target={bookingUrl.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="btn-secondary-white w-full justify-center text-sm"
                style={{ padding: "9px 16px" }}
              >
                Book a 1:1 with Shea
              </a>
            </div>
          </div>

          {/* Workflow canvas */}
          <div
            className="rounded-xl p-5 min-h-[280px]"
            style={{ background: "var(--ink-1)", border: "1px solid var(--ink-border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-2xs mb-0.5" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>
                  {workflow.sublabel.toUpperCase()}
                </p>
                <p className="text-sm font-semibold" style={{ color: "var(--ink-text)", letterSpacing: "-0.01em" }}>
                  {workflow.label}
                </p>
              </div>
              <span
                className="font-mono text-2xs px-2 py-1 rounded"
                style={{ background: "rgba(59,107,255,0.1)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.2)", letterSpacing: "0.06em" }}
              >
                EXAMPLE
              </span>
            </div>
            <WorkflowCanvas workflow={workflow} animate={animated} />
          </div>
        </div>

        {/* ⌘K hint */}
        <p className="mt-6 font-mono text-2xs" style={{ color: "var(--ink-text-3)" }}>
          <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--ink-3)", border: "1px solid var(--ink-border)" }}>⌘K</kbd>
          {" "}or{" "}
          <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--ink-3)", border: "1px solid var(--ink-border)" }}>/</kbd>
          {" "}to navigate
        </p>
      </div>
    </section>
  );
}
