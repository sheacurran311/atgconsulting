/**
 * Hero — vertical-aware interactive workflow demo.
 * Visitor picks a business type → matching workflow animates.
 * Run log includes human "Reviewed by Shea" steps.
 * Mobile: stacked. prefers-reduced-motion: instant reveal.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import LogoMark from "@/components/LogoMark";
import { VERTICALS } from "@/content/verticals";

type VerticalId = string;

interface WorkflowNode { id: string; type: "trigger" | "ai" | "tool" | "human" | "output"; label: string }

interface DemoWorkflow {
  verticalId: VerticalId;
  workflowName: string;
  nodes: WorkflowNode[];
  log: string[];
}

// Build demo workflows from the verticals config (one per vertical, first workflow)
const DEMOS: DemoWorkflow[] = VERTICALS.map((v) => {
  const wf = v.workflows[0]!;
  const toolLabel =
    wf.area === "ea" ? "Gmail · Calendar" :
    wf.area === "marketing" ? "Docs · Buffer" :
    wf.area === "sales" ? "CRM · Sheets" : "Helpdesk · Slack";
  return {
    verticalId: v.id,
    workflowName: wf.name,
    nodes: [
      { id: "t", type: "trigger", label: "Trigger fires" },
      { id: "a", type: "ai",      label: "AI does the work" },
      { id: "o", type: "tool",    label: toolLabel },
      { id: "h", type: "human",   label: "Shea reviews" },
      { id: "r", type: "output",  label: "Ready for your approval" },
    ],
    log: [
      "→ Workflow triggered on schedule",
      "→ " + wf.what.split(".")[0],
      "→ Output prepared for review",
      "✓ Reviewed by Shea",
      "→ Landed in your inbox · awaiting approval",
      "→ Nothing sent until you approve",
    ],
  };
});

const NODE_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  trigger: { bg: "var(--ink-2)",         border: "var(--ink-border)",         text: "var(--ink-text-2)" },
  ai:      { bg: "rgba(59,107,255,0.12)", border: "rgba(59,107,255,0.4)",     text: "var(--ink-text)" },
  tool:    { bg: "var(--ink-2)",         border: "var(--ink-border)",          text: "var(--ink-text-3)" },
  human:   { bg: "rgba(59,107,255,0.18)", border: "rgba(59,107,255,0.5)",     text: "var(--ink-text)" },
  output:  { bg: "rgba(59,107,255,0.08)", border: "rgba(59,107,255,0.25)",    text: "var(--ink-text)" },
};

function useRunLog(lines: string[], active: boolean) {
  const [visible, setVisible] = useState<string[]>([]);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    setVisible([]);
    if (!active) return;
    if (reduced) { setVisible(lines); return; }
    let i = 0;
    const id = setInterval(() => {
      if (i < lines.length) { setVisible((v) => [...v, lines[i]!]); i++; }
      else clearInterval(id);
    }, 420);
    return () => clearInterval(id);
  }, [lines, active, reduced]);
  return visible;
}

function WorkflowCanvas({ demo, animate }: { demo: DemoWorkflow; animate: boolean }) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [shownNodes, setShownNodes] = useState(0);
  const log = useRunLog(demo.log, animate);

  useEffect(() => {
    setShownNodes(0);
    if (!animate) return;
    if (reduced) { setShownNodes(demo.nodes.length); return; }
    let i = 0;
    const id = setInterval(() => { i++; setShownNodes(i); if (i >= demo.nodes.length) clearInterval(id); }, 260);
    return () => clearInterval(id);
  }, [demo, animate, reduced]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Nodes */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-1.5 sm:gap-0 min-h-[72px]">
        {demo.nodes.map((node, i) => {
          const s = NODE_STYLE[node.type] ?? NODE_STYLE.trigger!;
          const visible = i < shownNodes;
          return (
            <div key={node.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-0">
              {i > 0 && (
                <div className="hidden sm:flex items-center mx-1" style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms" }} aria-hidden="true">
                  <div className="w-5 h-px" style={{ background: "var(--blue)", opacity: 0.4 }} />
                  <span className="font-mono text-2xs ml-0.5" style={{ color: "var(--blue)", opacity: 0.6 }}>›</span>
                </div>
              )}
              {i > 0 && (
                <div className="sm:hidden ml-3 my-0.5" style={{ opacity: visible ? 1 : 0 }} aria-hidden="true">
                  <span className="font-mono text-xs" style={{ color: "var(--blue)", opacity: 0.5 }}>↓</span>
                </div>
              )}
              <div className="rounded-lg px-2.5 py-2 transition-all" style={{ background: s.bg, border: `1px solid ${s.border}`, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(6px)", transitionDuration: "280ms", minWidth: "90px" }}>
                <p className="font-mono text-2xs mb-0.5" style={{ color: "var(--blue)", opacity: 0.7, letterSpacing: "0.05em" }}>{node.type === "human" ? "HUMAN" : node.type.toUpperCase()}</p>
                <p className="text-xs font-medium" style={{ color: s.text, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{node.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Run log */}
      <div className="flex-1 rounded-lg p-3 font-mono text-xs overflow-hidden" style={{ background: "var(--ink-3)", border: "1px solid var(--ink-border)", minHeight: "110px" }}>
        <p className="mb-2 font-mono" style={{ color: "var(--blue)", opacity: 0.5, letterSpacing: "0.06em", fontSize: "10px" }}>
          RUN LOG · EXAMPLE · NOT REAL DATA
        </p>
        <div className="space-y-1">
          {log.map((line, i) => (
            <p key={i} style={{ color: line.startsWith("✓") ? "var(--blue)" : "var(--ink-text-2)", fontWeight: line.startsWith("✓") ? 600 : 400 }}>
              {line}
            </p>
          ))}
          {animate && log.length < demo.log.length && (
            <p className="logo-cursor-blink" style={{ color: "var(--blue)" }}>█</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const [activeVerticalId, setActiveVerticalId] = useState(VERTICALS[0]!.id);
  const [animated, setAnimated] = useState(true);
  const bookingUrl = typeof window !== "undefined" ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book") : "#book";

  const demo = DEMOS.find((d) => d.verticalId === activeVerticalId) ?? DEMOS[0]!;
  const vertical = VERTICALS.find((v) => v.id === activeVerticalId) ?? VERTICALS[0]!;

  function selectVertical(id: string) {
    setActiveVerticalId(id);
    setAnimated(false);
    setTimeout(() => setAnimated(true), 60);
  }

  // Auto-cycle
  useEffect(() => {
    const ids = VERTICALS.map((v) => v.id);
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % ids.length;
      selectVertical(ids[i]!);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden" style={{ background: "var(--ink)", minHeight: "90vh" }} aria-labelledby="hero-heading">
      <div className="absolute inset-0 bg-dot-dark pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,107,255,0.07) 0%, transparent 70%)" }} aria-hidden="true" />

      <div className="relative max-w-wide mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16">
        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-8">
          <LogoMark variant="dark" size={18} aria-hidden blink />
          <span className="font-mono text-2xs" style={{ color: "var(--ink-text-3)", letterSpacing: "0.08em" }}>ATG CONSULTING · CO · USA</span>
          <span className="w-px h-3" style={{ background: "var(--ink-border)" }} aria-hidden="true" />
          <span className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>AI WORKFLOWS · DONE FOR YOU</span>
        </div>

        {/* Headline */}
        <h1 id="hero-heading" className="display-xl mb-5" style={{ color: "var(--ink-text)", maxWidth: "780px" }}>
          We build the AI workflows.{" "}
          <span style={{ color: "var(--blue)" }}>You get the hours back.</span>
        </h1>

        <p className="text-md leading-relaxed mb-3 max-w-xl" style={{ color: "var(--ink-text-2)" }}>
          Shea designs and runs AI workflows for your specific business — across admin, marketing,
          sales, and customer replies. You don&apos;t prompt it. It runs on a schedule and hands
          you finished work to approve.
        </p>
        <p className="text-sm mb-10" style={{ color: "var(--ink-text-3)" }}>
          No tech background needed. Works with the tools you already use.
        </p>

        {/* Layout: vertical picker left, demo right */}
        <div className="grid lg:grid-cols-[240px_1fr] gap-8 items-start">
          {/* Vertical selector */}
          <div>
            <p className="font-mono text-2xs mb-3" style={{ color: "var(--ink-text-3)", letterSpacing: "0.08em" }}>YOUR BUSINESS TYPE</p>
            <div className="flex flex-col gap-1.5">
              {VERTICALS.map((v) => (
                <button key={v.id} type="button" onClick={() => selectVertical(v.id)}
                  className="text-left px-3 py-2.5 rounded-lg transition-all"
                  style={{ background: activeVerticalId === v.id ? "var(--ink-2)" : "transparent", border: `1px solid ${activeVerticalId === v.id ? "var(--blue)" : "var(--ink-border)"}`, color: activeVerticalId === v.id ? "var(--ink-text)" : "var(--ink-text-2)", transitionDuration: "120ms" }}
                >
                  <span className="text-sm font-medium">{v.label}</span>
                </button>
              ))}
            </div>
            {/* CTAs */}
            <div className="mt-6 flex flex-col gap-2">
              <Link to="/start"><span className="btn-primary w-full justify-center">Map my workflow →</span></Link>
              <a href={bookingUrl} target={bookingUrl.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="btn-secondary-white w-full justify-center text-sm" style={{ padding: "9px 16px" }}>Book a 1:1 with Shea</a>
            </div>
          </div>

          {/* Demo canvas */}
          <div className="rounded-xl p-5 min-h-[260px]" style={{ background: "var(--ink-1)", border: "1px solid var(--ink-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-2xs mb-0.5" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>{vertical.label.toUpperCase()}</p>
                <p className="text-sm font-semibold" style={{ color: "var(--ink-text)", letterSpacing: "-0.01em" }}>{demo.workflowName}</p>
              </div>
              <span className="font-mono text-2xs px-2 py-1 rounded" style={{ background: "rgba(59,107,255,0.1)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.2)" }}>EXAMPLE</span>
            </div>
            <WorkflowCanvas demo={demo} animate={animated} />
          </div>
        </div>

        {/* ⌘K hint */}
        <p className="mt-6 font-mono text-2xs" style={{ color: "var(--ink-text-3)" }}>
          <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--ink-3)", border: "1px solid var(--ink-border)" }}>⌘K</kbd>
          {" "}or{" "}
          <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--ink-3)", border: "1px solid var(--ink-border)" }}>/</kbd>
          {" "}to navigate quickly
        </p>
      </div>
    </section>
  );
}
