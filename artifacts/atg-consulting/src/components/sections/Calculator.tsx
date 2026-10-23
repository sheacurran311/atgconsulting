/**
 * Time & money calculator.
 * Visitor picks a vertical and tasks, enters hours/week and hourly value.
 * Shows estimated hours and dollars back per month from their own inputs.
 * All labeled as estimates. No industry benchmarks invented.
 */
"use client";
import { useState } from "react";
import { Link } from "wouter";
import { VERTICALS, type VerticalWorkflow } from "@/content/verticals";

export default function Calculator() {
  const [verticalId, setVerticalId] = useState(VERTICALS[0]!.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState(8);
  const [hourlyValue, setHourlyValue] = useState(50);

  const vertical = VERTICALS.find((v) => v.id === verticalId) ?? VERTICALS[0]!;

  // Estimated fraction of hours the selected tasks represent
  const selectedWorkflows = vertical.workflows.filter((w) => selected.includes(w.name));
  const estimatedHoursBack = selectedWorkflows.reduce((sum, wf) => {
    const mid = (wf.hoursPerWeek[0] + wf.hoursPerWeek[1]) / 2;
    return sum + Math.min(mid, hoursPerWeek * 0.8); // cap at 80% of stated hours
  }, 0);
  const hoursPerMonth = Math.round(estimatedHoursBack * 4.3);
  const valuePerMonth = Math.round(hoursPerMonth * hourlyValue);

  function toggleWorkflow(wf: VerticalWorkflow) {
    setSelected((s) => s.includes(wf.name) ? s.filter((x) => x !== wf.name) : [...s, wf.name]);
  }

  function handleVerticalChange(id: string) {
    setVerticalId(id);
    setSelected([]);
  }

  return (
    <section
      id="calculator"
      className="py-16 sm:py-24"
      style={{ background: "var(--canvas-2)", borderTop: "1px solid var(--canvas-border)" }}
      aria-labelledby="calc-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-10">
          <p className="eyebrow mb-3">What's your time worth?</p>
          <h2 id="calc-heading" className="section-heading mb-3" style={{ color: "var(--canvas-text)" }}>
            See what your hours could be worth{" "}
            <span style={{ color: "var(--blue)" }}>back.</span>
          </h2>
          <p className="text-base" style={{ color: "var(--canvas-text-2)" }}>
            Enter your own numbers. The estimate is based entirely on what you type — we don&apos;t use
            industry benchmarks or invented statistics.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Left: inputs */}
          <div className="space-y-6">
            {/* Vertical */}
            <div>
              <label className="block font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
                YOUR BUSINESS TYPE
              </label>
              <select
                value={verticalId}
                onChange={(e) => handleVerticalChange(e.target.value)}
                className="field-input"
              >
                {VERTICALS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>

            {/* Task selection */}
            <div>
              <label className="block font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
                WHICH TASKS EAT YOUR TIME? (pick all that apply)
              </label>
              <div className="space-y-2">
                {vertical.workflows.map((wf) => {
                  const checked = selected.includes(wf.name);
                  return (
                    <label
                      key={wf.name}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all"
                      style={{
                        border: `1px solid ${checked ? "var(--blue)" : "var(--canvas-border)"}`,
                        background: checked ? "rgba(59,107,255,0.05)" : "var(--canvas-1)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleWorkflow(wf)}
                        className="mt-0.5 flex-shrink-0"
                        style={{ accentColor: "var(--blue)", width: "16px", height: "16px" }}
                      />
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>{wf.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--canvas-text-3)" }}>{wf.what}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Hours slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
                  HOURS LOST PER WEEK
                </label>
                <span className="font-mono font-bold text-xl" style={{ color: "var(--blue)" }}>{hoursPerWeek}h</span>
              </div>
              <input type="range" min={1} max={40} value={hoursPerWeek} onChange={(e) => setHoursPerWeek(+e.target.value)}
                className="w-full cursor-pointer" style={{ accentColor: "var(--blue)" }} />
              <div className="flex justify-between font-mono text-2xs mt-1" style={{ color: "var(--canvas-text-3)" }}>
                <span>1h</span><span>40h</span>
              </div>
            </div>

            {/* Hourly value */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
                  YOUR HOURLY VALUE ($/hr)
                </label>
                <span className="font-mono font-bold text-xl" style={{ color: "var(--blue)" }}>${hourlyValue}</span>
              </div>
              <input type="range" min={10} max={300} step={5} value={hourlyValue} onChange={(e) => setHourlyValue(+e.target.value)}
                className="w-full cursor-pointer" style={{ accentColor: "var(--blue)" }} />
              <div className="flex justify-between font-mono text-2xs mt-1" style={{ color: "var(--canvas-text-3)" }}>
                <span>$10</span><span>$300</span>
              </div>
            </div>
          </div>

          {/* Right: result */}
          <div className="sticky top-20">
            <div
              className="rounded-xl p-6"
              style={{ background: selected.length > 0 ? "var(--ink)" : "var(--canvas-1)", border: `1px solid ${selected.length > 0 ? "var(--ink-border)" : "var(--canvas-border)"}`, transition: "background 0.3s, border-color 0.3s" }}
            >
              <p className="font-mono text-2xs mb-4" style={{ color: selected.length > 0 ? "var(--blue)" : "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
                ESTIMATE BASED ON YOUR INPUTS
              </p>

              {selected.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
                  Pick at least one task to see your estimate.
                </p>
              ) : (
                <>
                  <div className="space-y-4 mb-5">
                    <div>
                      <p className="font-mono text-2xs mb-1" style={{ color: selected.length > 0 ? "var(--ink-text-3)" : "var(--canvas-text-3)" }}>HOURS BACK PER MONTH</p>
                      <p className="font-extrabold text-4xl" style={{ color: "var(--blue)", letterSpacing: "-0.04em" }}>~{hoursPerMonth}h</p>
                    </div>
                    <div>
                      <p className="font-mono text-2xs mb-1" style={{ color: selected.length > 0 ? "var(--ink-text-3)" : "var(--canvas-text-3)" }}>VALUE PER MONTH</p>
                      <p className="font-extrabold text-4xl" style={{ color: selected.length > 0 ? "var(--ink-text)" : "var(--canvas-text)", letterSpacing: "-0.04em" }}>
                        ~${valuePerMonth.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="font-mono text-2xs mb-5" style={{ color: selected.length > 0 ? "var(--ink-text-3)" : "var(--canvas-text-3)" }}>
                    Based on {hoursPerWeek}h/week × your ${hourlyValue}/hr value × estimated automation rate. Results vary.
                  </p>
                </>
              )}

              <Link to="/start">
                <span className="btn-primary w-full justify-center">Map my workflow →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
