/**
 * Conversational intake — one question at a time.
 * Keyboard: Enter to advance, number keys to pick options, Backspace to go back.
 * A live "workflow map" panel builds up as the user answers.
 * Mobile: stacked single-column, workflow map hidden.
 * Respects prefers-reduced-motion.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import type { Area, BizSize, PreferredHelp, Tool, TimeSink } from "@/types/intake";
import { AREA_LABELS, AREA_DESCRIPTIONS, BIZ_SIZE_LABELS, PREFERRED_HELP_LABELS, AI_COMFORT_LABELS, TOOL_LABELS, TIME_SINK_LABELS, AREA_TIME_SINKS } from "@/types/intake";
import { VERTICALS } from "@/content/verticals";

// ── Question definitions ──────────────────────────────────────────────────────
type FieldKey =
  | "name" | "email" | "role" | "industry"
  | "bizSize" | "areas" | "aiComfort"
  | "tools" | "timeSinks" | "automateFirst"
  | "hoursLost" | "preferredHelp" | "freeText"
  | "toolBudget" | "currentSoftware" | "weeklyVolumes";

interface QuestionDef {
  key: FieldKey;
  prompt: string;
  sub?: string;
  type: "text" | "email" | "radio" | "multi" | "slider" | "textarea";
  options?: { value: string; label: string; sub?: string }[];
  optional?: boolean;
  skip?: (data: Partial<FormData>) => boolean;
}

type FormData = {
  name: string; email: string; role: string; industry: string;
  bizSize: BizSize; areas: Area[]; aiComfort: number;
  tools: Tool[]; timeSinks: TimeSink[];
  automateFirst: string; hoursLost: number;
  preferredHelp: PreferredHelp; freeText: string; honeypot: string;
  toolBudget: string; currentSoftware: string; weeklyVolumes: string;
};

const TOOL_BUDGETS = [
  { value: "<$50/mo",      label: "Under $50 / month" },
  { value: "$50-150/mo",   label: "$50 – $150 / month" },
  { value: "$150-500/mo",  label: "$150 – $500 / month" },
  { value: "$500+/mo",     label: "$500+ / month" },
  { value: "not_sure",     label: "Not sure yet" },
];
const WEEKLY_VOLUMES = [
  { value: "<10/wk",    label: "Fewer than 10 per week" },
  { value: "10-50/wk",  label: "10 – 50 per week" },
  { value: "50-200/wk", label: "50 – 200 per week" },
  { value: "200+/wk",   label: "200+ per week" },
  { value: "varies",    label: "It varies a lot" },
];

const DEFAULT: FormData = {
  name: "", email: "", role: "", industry: "",
  bizSize: "solo", areas: [], aiComfort: 1,
  tools: [], timeSinks: [], automateFirst: "",
  hoursLost: 10, preferredHelp: "not_sure", freeText: "", honeypot: "",
  toolBudget: "", currentSoftware: "", weeklyVolumes: "",
};

const AREAS: Area[] = ["executive_assistant", "marketing", "sales", "customer_support"];
const TOOLS: Tool[] = ["chatgpt", "claude", "gemini", "grok", "copilot", "zapier_make", "crm", "none", "other"];

function buildQuestions(data: Partial<FormData>): QuestionDef[] {
  const relevantSinks = ((): TimeSink[] => {
    const seen = new Set<TimeSink>();
    const all: TimeSink[] = ["email","prospecting","followups","research","proposals","scheduling","social_content","admin","personal_logistics"];
    const areas = data.areas ?? [];
    areas.forEach((a) => AREA_TIME_SINKS[a]?.forEach((s) => seen.add(s)));
    return seen.size > 0 ? all.filter((s) => seen.has(s)) : all;
  })();

  return [
    { key: "name", prompt: "What's your name?", type: "text" },
    { key: "email", prompt: "What's your email?", sub: "We'll send your snapshot here.", type: "email" },
    {
      key: "bizSize", prompt: "What best describes your business?", sub: "No right answer — just helps us tailor your snapshot.", type: "radio",
      options: [
        { value: "solo", label: "Just me — I run everything myself" },
        { value: "2-10", label: "Small team (2–10 people)" },
        { value: "11-50", label: "Growing business (11–50 people)" },
        { value: "50+", label: "Larger business (50+ people)" },
      ],
    },
    {
      key: "industry", prompt: "What type of business is it?", sub: "Pick the one that fits best.", type: "radio",
      options: VERTICALS.map((v) => ({ value: v.id, label: v.label, sub: v.tagline })),
    },
    { key: "role", prompt: "What's your role?", sub: "e.g. Owner, manager, solo operator — in your own words", type: "text" },
    {
      key: "areas", prompt: "What eats the most of your week?", sub: "Pick all that apply. Plain English — no jargon.", type: "multi",
      options: AREAS.map((a) => ({ value: a, label: AREA_LABELS[a], sub: AREA_DESCRIPTIONS[a] })),
    },
    {
      key: "aiComfort", prompt: "How would you describe your AI experience?", type: "radio",
      options: AI_COMFORT_LABELS.map((l, i) => ({ value: String(i), label: l })),
    },
    {
      key: "tools", prompt: "Which tools do you use today?", sub: "Pick all that apply.", type: "multi",
      options: TOOLS.map((t) => ({ value: t, label: TOOL_LABELS[t] })),
    },
    {
      key: "timeSinks", prompt: "What eats the most of your time?", sub: "Based on your selected areas.", type: "multi",
      options: relevantSinks.map((s) => ({ value: s, label: TIME_SINK_LABELS[s] })),
    },
    { key: "automateFirst", prompt: "If someone could handle one task for you starting tomorrow, what would it be?", sub: "Don't overthink it — the first thing that came to mind is probably the right answer.", type: "text", optional: true },
    { key: "hoursLost", prompt: "Roughly how many hours per week do repetitive tasks take up?", sub: "Emails, follow-ups, writing, scheduling, admin — add it up.", type: "slider" },
    {
      key: "toolBudget", prompt: "What's your rough monthly budget for tools and software?", sub: "We'll recommend tools in your range. No pressure to commit.", type: "radio",
      options: TOOL_BUDGETS,
    },
    { key: "currentSoftware", prompt: "What software do you use most in your business?", sub: "By name — e.g. Gmail, QuickBooks, HubSpot. Helps us recommend tools that connect.", type: "text", optional: true },
    {
      key: "weeklyVolumes", prompt: "How many of your main tasks happen per week?", sub: "E.g. leads, jobs, customer emails, orders — pick the range that fits best.", type: "radio",
      options: WEEKLY_VOLUMES,
    },
    {
      key: "preferredHelp", prompt: "How do you prefer to get help?", type: "radio",
      options: (["self_serve","guided","done_for_you","not_sure"] as PreferredHelp[]).map((v) => ({ value: v, label: PREFERRED_HELP_LABELS[v] })),
    },
    { key: "freeText", prompt: "Anything else we should know?", sub: "Constraints, timeline, anything else on your mind.", type: "textarea", optional: true },
  ].filter((q) => !(q as QuestionDef).skip?.((data as Parameters<NonNullable<QuestionDef["skip"]>>[0]))) as QuestionDef[];
}

// ── Workflow map panel (builds up as user answers) ────────────────────────────
function WorkflowMap({ data }: { data: Partial<FormData> }) {
  const areas = data.areas ?? [];
  const hasAreas = areas.length > 0;

  return (
    <div className="rounded-xl overflow-hidden h-full" style={{ border: "1px solid var(--ink-border)", background: "var(--ink-1)" }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--ink-border)", background: "var(--ink-2)" }}>
        <span className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>YOUR WORKFLOW MAP</span>
        <span className="font-mono text-2xs ml-auto" style={{ color: "var(--ink-text-3)" }}>building…</span>
      </div>
      <div className="p-4 space-y-3">
        {/* User node */}
        {data.name && (
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded flex items-center justify-center font-mono text-xs font-bold" style={{ background: "rgba(59,107,255,0.12)", border: "1px solid rgba(59,107,255,0.3)", color: "var(--blue)" }}>
              {data.name[0]?.toUpperCase()}
            </span>
            <div>
              <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>YOU</p>
              <p className="text-xs" style={{ color: "var(--ink-text)" }}>{data.name}{data.role ? ` · ${data.role}` : ""}</p>
            </div>
          </div>
        )}

        {/* Area nodes */}
        {hasAreas && (
          <>
            <div className="w-px h-4 ml-3.5" style={{ background: "var(--blue)", opacity: 0.3 }} aria-hidden="true" />
            <div className="flex flex-col gap-2">
              {areas.map((a) => (
                <div key={a} className="rounded-md px-2.5 py-1.5" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-border)" }}>
                  <p className="font-mono text-2xs" style={{ color: "var(--blue)", opacity: 0.7, letterSpacing: "0.06em" }}>{a.replace("_"," ").toUpperCase()}</p>
                  <p className="text-xs" style={{ color: "var(--ink-text-2)" }}>{AREA_LABELS[a]}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Time sinks */}
        {(data.timeSinks?.length ?? 0) > 0 && (
          <>
            <div className="w-px h-4 ml-3.5" style={{ background: "var(--blue)", opacity: 0.3 }} aria-hidden="true" />
            <div className="flex flex-wrap gap-1.5">
              {data.timeSinks!.map((s) => (
                <span key={s} className="font-mono text-2xs px-2 py-0.5 rounded" style={{ background: "var(--ink-3)", color: "var(--ink-text-3)", border: "1px solid var(--ink-border)" }}>
                  {TIME_SINK_LABELS[s]}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Hours */}
        {data.hoursLost && data.hoursLost > 0 && (
          <p className="font-mono text-2xs mt-2" style={{ color: "var(--ink-text-3)" }}>
            ≈ {data.hoursLost}h/week at risk
          </p>
        )}

        {/* Preferred help */}
        {data.preferredHelp && data.preferredHelp !== "not_sure" && (
          <div className="mt-2 rounded-md px-2.5 py-1.5" style={{ background: "rgba(59,107,255,0.08)", border: "1px solid rgba(59,107,255,0.2)" }}>
            <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>RECOMMENDED</p>
            <p className="text-xs" style={{ color: "var(--ink-text)" }}>{PREFERRED_HELP_LABELS[data.preferredHelp]}</p>
          </div>
        )}

        {!data.name && !hasAreas && (
          <p className="font-mono text-2xs" style={{ color: "var(--ink-text-3)" }}>Answer questions to build your map…</p>
        )}
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function IntakeForm({ preselectedTier }: { preselectedTier?: "done_for_you" | "guided" | "self_serve" | null }) {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<FormData>({
    ...DEFAULT,
    ...(preselectedTier ? { preferredHelp: preselectedTier } : {}),
  });
  const dataRef = useRef(data);
  dataRef.current = data;
  const [qIdx, setQIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentValue, setCurrentValue] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const questions = buildQuestions(data);
  const q = questions[qIdx];
  const isLast = qIdx === questions.length - 1;

  // Focus input on question change
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
    setError(null);
    // Pre-fill current value from data
    if (!q) return;
    if (q.type === "text" || q.type === "email" || q.type === "textarea") {
      setCurrentValue((data[q.key] as string) ?? "");
    } else if (q.type === "slider") {
      setCurrentValue(String((data[q.key] as number) ?? 10));
    }
  }, [qIdx, q]);

  // Keyboard: number keys for radio/multi
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!q) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && q.options && n <= q.options.length) {
        const opt = q.options[n - 1]!;
        handleOption(opt.value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [q, data]);

  const handleOption = useCallback((value: string) => {
    if (!q) return;
    if (q.type === "radio") {
      setData((d) => {
        const next = { ...d };
        if (q.key === "bizSize") next.bizSize = value as BizSize;
        else if (q.key === "industry") next.industry = value;
        else if (q.key === "aiComfort") next.aiComfort = parseInt(value, 10);
        else if (q.key === "preferredHelp") next.preferredHelp = value as PreferredHelp;
        else if (q.key === "toolBudget") next.toolBudget = value;
        else if (q.key === "weeklyVolumes") next.weeklyVolumes = value;
        dataRef.current = next;
        return next;
      });
      // Auto-advance for radio. validate() reads dataRef so this sees the pick.
      setTimeout(() => advance(), 150);
    } else if (q.type === "multi") {
      if (q.key === "areas") {
        setData((d) => {
          const arr = d.areas.includes(value as Area)
            ? d.areas.filter((x) => x !== value)
            : [...d.areas, value as Area];
          return { ...d, areas: arr };
        });
      } else if (q.key === "tools") {
        setData((d) => {
          const arr = d.tools.includes(value as Tool)
            ? d.tools.filter((x) => x !== value)
            : [...d.tools, value as Tool];
          return { ...d, tools: arr };
        });
      } else if (q.key === "timeSinks") {
        setData((d) => {
          const arr = d.timeSinks.includes(value as TimeSink)
            ? d.timeSinks.filter((x) => x !== value)
            : [...d.timeSinks, value as TimeSink];
          return { ...d, timeSinks: arr };
        });
      }
    }
  }, [q]);

  function validate(): boolean {
    if (!q) return true;
    if (q.optional) return true;
    if (q.type === "text" || q.type === "email" || q.type === "textarea") {
      if (!currentValue.trim()) { setError(`Please enter your ${q.key}.`); return false; }
      if (q.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentValue)) {
        setError("Please enter a valid email."); return false;
      }
    }
    if (q.type === "radio") {
      const latest = dataRef.current;
      if (q.key === "bizSize" && !latest.bizSize) { setError("Please pick one."); return false; }
      if (q.key === "industry" && !latest.industry) { setError("Please pick one."); return false; }
    }
    if (q.type === "multi") {
      if (q.key === "areas" && data.areas.length === 0) { setError("Please select at least one area."); return false; }
      if (q.key === "tools" && data.tools.length === 0) { setError("Please select at least one."); return false; }
      if (q.key === "timeSinks" && data.timeSinks.length === 0) { setError("Please select at least one."); return false; }
    }
    return true;
  }

  function commitCurrent() {
    if (!q) return;
    if (q.type === "text" || q.type === "email") setData((d) => ({ ...d, [q.key]: currentValue }));
    else if (q.type === "textarea") setData((d) => ({ ...d, [q.key]: currentValue }));
    else if (q.type === "slider") setData((d) => ({ ...d, hoursLost: parseInt(currentValue, 10) }));
    else if (q.key === "automateFirst") setData((d) => ({ ...d, automateFirst: currentValue }));
  }

  function advance() {
    commitCurrent();
    if (!validate()) return;
    if (isLast) { commitCurrent(); submit(); return; }
    setQIdx((i) => i + 1);
  }

  function back() {
    if (qIdx > 0) { commitCurrent(); setQIdx((i) => i - 1); }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...data };
      if (payload.automateFirst === "") payload.automateFirst = undefined as unknown as string;
      if (payload.freeText === "") payload.freeText = undefined as unknown as string;
      const res = await fetch("/api/intake", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { intakeId?: string; error?: string };
      if (!res.ok) { setError(json.error ?? "Something went wrong."); setSubmitting(false); return; }
      if (!json.intakeId) { setError("Something went wrong."); setSubmitting(false); return; }
      setLocation(`/start/result/${json.intakeId}`);
    } catch {
      setError("Network error. Please check your connection.");
      setSubmitting(false);
    }
  }

  if (!q) return null;

  const currentRadioValue =
    q.key === "bizSize" ? data.bizSize :
    q.key === "industry" ? data.industry :
    q.key === "aiComfort" ? String(data.aiComfort) :
    q.key === "preferredHelp" ? data.preferredHelp :
    q.key === "toolBudget" ? data.toolBudget :
    q.key === "weeklyVolumes" ? data.weeklyVolumes : "";

  const currentMultiValues: string[] =
    q.key === "areas" ? data.areas :
    q.key === "tools" ? data.tools :
    q.key === "timeSinks" ? data.timeSinks : [];

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
      {/* Question panel */}
      <div>
        {/* Progress rail */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex-1 h-px" style={{ background: "var(--canvas-border)" }}>
            <div
              className="h-full transition-all"
              style={{
                width: `${((qIdx) / questions.length) * 100}%`,
                background: "var(--blue)",
                transitionDuration: "300ms",
              }}
            />
          </div>
          <span className="font-mono text-2xs flex-shrink-0" style={{ color: "var(--canvas-text-3)" }}>
            {qIdx + 1}/{questions.length}
          </span>
        </div>

        {/* Honeypot */}
        <div aria-hidden="true" className="hidden" tabIndex={-1}>
          <input
            type="text" name="website" autoComplete="off" tabIndex={-1}
            value={data.honeypot}
            onChange={(e) => setData((d) => ({ ...d, honeypot: e.target.value }))}
          />
        </div>

        {/* Question */}
        <div className="mb-6">
          <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>
            {String(qIdx + 1).padStart(2, "0")} / {String(questions.length).padStart(2, "0")}
          </p>
          <h2 className="font-extrabold text-2xl mb-1" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>
            {q.prompt}
            {q.optional && <span className="text-sm font-normal ml-2" style={{ color: "var(--canvas-text-3)" }}>(optional)</span>}
          </h2>
          {q.sub && <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{q.sub}</p>}
        </div>

        {/* Input area */}
        <div className="mb-6">
          {(q.type === "text" || q.type === "email") && (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={q.type}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); advance(); } }}
              className="field-input text-lg"
              style={{ fontSize: "18px", padding: "14px 16px" }}
              autoComplete={q.key === "email" ? "email" : q.key === "name" ? "name" : "off"}
            />
          )}
          {q.type === "textarea" && (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              rows={4}
              className="field-input resize-none"
              style={{ fontSize: "15px" }}
              maxLength={280}
            />
          )}
          {q.type === "slider" && (
            <div>
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="range" min={1} max={40} step={1}
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  className="flex-1 cursor-pointer"
                  style={{ accentColor: "var(--blue)" }}
                />
                <span className="font-mono font-bold text-2xl w-16 text-right" style={{ color: "var(--blue)" }}>
                  {currentValue}h
                </span>
              </div>
              <div className="flex justify-between font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>
                <span>1h</span><span>10h</span><span>20h</span><span>30h</span><span>40h</span>
              </div>
            </div>
          )}
          {q.type === "radio" && q.options && (
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const sel = currentRadioValue === opt.value;
                return (
                  <button
                    key={opt.value} type="button"
                    onClick={() => handleOption(opt.value)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                    style={{
                      border: `1px solid ${sel ? "var(--blue)" : "var(--canvas-border)"}`,
                      background: sel ? "rgba(59,107,255,0.06)" : "var(--canvas-1)",
                      transitionDuration: "120ms",
                    }}
                  >
                    <span className="font-mono text-2xs w-5 flex-shrink-0" style={{ color: "var(--canvas-text-3)" }}>{i + 1}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          {q.type === "multi" && q.options && (
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const sel = currentMultiValues.includes(opt.value);
                return (
                  <button
                    key={opt.value} type="button"
                    onClick={() => handleOption(opt.value)}
                    className={sel ? "chip-selected" : "chip-unselected"}
                    aria-pressed={sel}
                  >
                    {sel && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }} role="alert">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button" onClick={back} disabled={qIdx === 0}
            className="btn-ghost" style={{ visibility: qIdx === 0 ? "hidden" : "visible" }}
          >
            ← Back
          </button>
          <button
            type="button" onClick={advance} disabled={submitting}
            className="btn-primary"
          >
            {submitting
              ? <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Building…</span>
              : isLast ? "Get my snapshot →" : "Continue →"
            }
          </button>
        </div>

        <p className="mt-4 text-center font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>
          ENTER to continue · ← → arrows · number keys to pick
        </p>
      </div>

      {/* Workflow map (desktop only) */}
      <div className="hidden lg:block sticky top-20">
        <WorkflowMap data={data} />
      </div>
    </div>
  );
}
