/**
 * SkillCustomizerModal — generates a customized SKILL.md + routine prompt.
 * Combines with the existing InstallModal flow (shown after customization).
 * Reuses InstallModal for the final install steps.
 */
import { useState } from "react";
import { api } from "@/lib/api";

type Platform = "grok_bot" | "claude" | "chatgpt";

const PLATFORM_LABELS: Record<Platform, string> = {
  grok_bot: "Grok Bot",
  claude:   "Claude",
  chatgpt:  "ChatGPT",
};

interface Props {
  slug: string;
  name: string;
  onClose: () => void;
}

export default function SkillCustomizerModal({ slug, name, onClose }: Props) {
  const [platform, setPlatform] = useState<Platform>("grok_bot");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<{ skillMd: string; routinePrompt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"skill" | "routine" | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const r = await api.aiAssist.customizeSkill(slug, platform, context || undefined).catch((e: Error) => {
      setError(e.message.includes("enabled") ? "AI Assist is not enabled yet." : e.message);
      return null;
    });
    if (r) setResult(r);
    setLoading(false);
  }

  async function copy(type: "skill" | "routine") {
    const text = type === "skill" ? result?.skillMd : result?.routinePrompt;
    if (!text) return;
    await navigator.clipboard.writeText(text).catch(() => null);
    setCopied(type);
    setTimeout(() => setCopied((p) => p === type ? null : p), 2000);
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Customise ${name}`}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full overflow-y-auto" style={{ maxWidth: "600px", maxHeight: "92vh", background: "var(--canvas-1)", borderRadius: "16px", border: "1px solid var(--canvas-border)", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--canvas-border)" }}>
          <div>
            <p className="font-mono text-2xs mb-0.5" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>CUSTOMISE SKILL</p>
            <p className="font-extrabold text-base" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>{name}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost text-sm p-2" aria-label="Close">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {!result ? (
            <>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: "var(--canvas-text)" }}>Platform</p>
                <div className="flex gap-2">
                  {(["grok_bot", "claude", "chatgpt"] as Platform[]).map((p) => (
                    <button key={p} type="button" onClick={() => setPlatform(p)}
                      className="text-sm px-3 py-1.5 rounded-lg"
                      style={{
                        border: `1px solid ${p === platform ? "var(--blue)" : "var(--canvas-border)"}`,
                        background: p === platform ? "rgba(59,107,255,0.08)" : "var(--canvas-2)",
                        color: p === platform ? "var(--blue)" : "var(--canvas-text-2)",
                      }}
                    >{PLATFORM_LABELS[p]}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>
                  EXTRA CONTEXT (optional)
                </label>
                <textarea
                  className="field-input text-sm w-full"
                  rows={3}
                  placeholder="e.g. I run a plumbing business, need follow-up emails after each job…"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  maxLength={500}
                />
              </div>

              {error && <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>}

              <button type="button" onClick={generate} disabled={loading}
                className="btn-primary text-sm w-full" style={{ padding: "10px" }}>
                {loading ? "Customising…" : "Generate customised SKILL.md + routine prompt"}
              </button>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>CUSTOMISED SKILL.MD</p>
                  <button type="button" onClick={() => copy("skill")} className="text-xs font-semibold" style={{ color: "var(--blue)" }}>
                    {copied === "skill" ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <div className="rounded-xl p-3 font-mono text-xs overflow-auto" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)", maxHeight: "220px", whiteSpace: "pre-wrap", color: "var(--canvas-text)" }}>
                  {result.skillMd}
                </div>
              </div>

              {result.routinePrompt && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>SCHEDULED ROUTINE PROMPT</p>
                    <button type="button" onClick={() => copy("routine")} className="text-xs font-semibold" style={{ color: "var(--blue)" }}>
                      {copied === "routine" ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                  <div className="rounded-xl p-3 text-xs overflow-auto" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)", maxHeight: "160px", whiteSpace: "pre-wrap", color: "var(--canvas-text)" }}>
                    {result.routinePrompt}
                  </div>
                </div>
              )}

              <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
                Paste the SKILL.md into {PLATFORM_LABELS[platform]} as your system prompt. Use the routine prompt for your scheduled task trigger.
              </p>

              <button type="button" onClick={() => setResult(null)} className="btn-ghost text-sm">
                ← Customise again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
