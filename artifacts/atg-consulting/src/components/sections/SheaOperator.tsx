/**
 * Shea — "Your operator" section.
 * Content driven by src/content/shea.ts — edit that file to update bio and steps.
 */
import { useState } from "react";
import { Link } from "wouter";
import { SHEA } from "@/content/shea";

function SheaAvatar({ size = 80 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  if (SHEA.photo && !failed) {
    return (
      <img
        src={SHEA.photo}
        alt={SHEA.name}
        width={size}
        height={size}
        className="rounded-2xl object-cover flex-shrink-0"
        style={{ width: size, height: size, border: "1px solid var(--ink-border)" }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className="rounded-2xl flex items-center justify-center font-mono font-bold overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: "var(--ink-2)",
        border: "1px solid var(--ink-border)",
        fontSize: size * 0.3,
        color: "var(--blue)",
      }}
      aria-label={`${SHEA.name} photo placeholder`}
    >
      {SHEA.initials}
    </div>
  );
}

export default function SheaOperator() {


  return (
    <section
      id="about"
      className="py-16 sm:py-24"
      style={{ background: "var(--ink)" }}
      aria-labelledby="shea-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        {/* Grid: left=bio, right=what he does */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">

          {/* Left: identity */}
          <div>
            <p className="font-mono text-2xs mb-6" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
              WHO YOU WORK WITH
            </p>

            <div className="flex items-start gap-5 mb-6">
              <SheaAvatar size={72} />
              <div>
                <h2 id="shea-heading" className="font-extrabold text-2xl" style={{ color: "var(--ink-text)", letterSpacing: "-0.025em" }}>
                  {SHEA.name}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--ink-text-2)" }}>{SHEA.title}</p>
                <p className="font-mono text-2xs mt-1" style={{ color: "var(--ink-text-3)", letterSpacing: "0.06em" }}>{SHEA.location}</p>
              </div>
            </div>

            {/* Positioning line */}
            <p className="font-semibold text-lg mb-5" style={{ color: "var(--ink-text)", letterSpacing: "-0.02em", lineHeight: "1.4" }}>
              Commercial experience meets hands-on development.{" "}
              <span style={{ color: "var(--blue)" }}>From websites and branding to AI that works for you.</span>
            </p>

            {/* First-person note */}
            <div className="space-y-3">
              {SHEA.note.split("\n\n").map((para, i) => (
                <p key={i} className="text-base leading-relaxed"
                  style={{ color: para.startsWith("[") ? "var(--ink-text-3)" : "var(--ink-text-2)", fontStyle: para.startsWith("[") ? "italic" : "normal" }}>
                  {para}
                </p>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/intake"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ fontSize: "15px", padding: "12px 22px" }}
              >
                Discuss your project
              </a>
              <Link to="/intake">
                <span className="btn-secondary-white" style={{ fontSize: "15px", padding: "12px 22px" }}>
                  Start free assessment
                </span>
              </Link>
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--ink-text-3)" }}>
              Start with the free assessment to request a conversation.
            </p>
          </div>

          {/* Right: what Shea does */}
          <div>
            <p className="font-mono text-2xs mb-6" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
              HOW ATG WORKS WITH YOU
            </p>

            <div className="space-y-0">
              {SHEA.whatSheaDoesMarketing.map((item, i) => (
                <div
                  key={item.step}
                  className="flex gap-4 pb-5"
                  style={{ borderBottom: i < SHEA.whatSheaDoesMarketing.length - 1 ? "1px solid var(--ink-border)" : "none", marginBottom: "20px" }}
                >
                  <span
                    className="font-mono text-2xs font-bold w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(59,107,255,0.12)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.25)", letterSpacing: "0.04em", fontSize: "10px" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--ink-text)", letterSpacing: "-0.01em" }}>{item.step}</p>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--ink-text-2)" }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Product = workflows + Shea */}
            <div
              className="rounded-xl p-4 mt-2"
              style={{ background: "var(--ink-2)", border: "1px solid var(--ink-border)" }}
            >
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>THE APPROACH</p>
              <p className="text-sm font-medium" style={{ color: "var(--ink-text)", letterSpacing: "-0.01em" }}>
                Your goals <span style={{ color: "var(--blue)" }}>+</span> strategy <span style={{ color: "var(--blue)" }}>+</span> hands-on implementation
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--ink-text-2)" }}>
                ATG helps you choose and implement the right tools, then hands over a tested, documented solution.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
