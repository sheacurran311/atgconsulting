/**
 * InstallModal — shows platform-specific install instructions for a workflow.
 * Platforms: Grok Bot, Claude, ChatGPT. Includes SKILL.md download + copy-paste routine.
 * "Try with a sample" is the in-app preview (existing SkillRunner flow).
 * Respects product boundary: ATG delivers the SKILL.md; the client installs it
 * in their own AI platform. No OAuth, no sending from ATG.
 */
import { useState } from "react";
import { api } from "@/lib/api";

type Platform = "grok_bot" | "claude" | "chatgpt";

const PLATFORM_LABELS: Record<Platform, string> = {
  grok_bot: "Grok Bot",
  claude:   "Claude",
  chatgpt:  "ChatGPT",
};

const PLATFORM_SETUP: Record<Platform, { sub: string; steps: string[]; scheduleNote: string }> = {
  grok_bot: {
    sub: "xAI's Grok Bot supports custom actions and scheduled routines. Recommended for ATG workflows.",
    steps: [
      "Download the SKILL.md file below.",
      "Open Grok Bot at x.com/grok and start a new conversation.",
      "Paste the SKILL.md content into the system prompt of a custom action.",
      "In 'Scheduled Tasks', create a new task, paste the trigger prompt, and set your schedule (daily, weekly, etc.).",
      "Add the accounts it needs under 'Connections' in your Grok settings (e.g. Gmail, Google Calendar).",
      "Run a test message to confirm output — approve or edit before anything is sent.",
    ],
    scheduleNote: "Grok Bot can run scheduled tasks daily or weekly and posts results to your chosen channel.",
  },
  claude: {
    sub: "Claude Projects with custom instructions and scheduled prompts via the Claude API or zapier.com/claude.",
    steps: [
      "Download the SKILL.md file below.",
      "Open Claude (claude.ai) and create a new Project.",
      "Paste the SKILL.md content into the Project Instructions field.",
      "To schedule the workflow: connect Claude to your tools via a no-code platform (e.g. Zapier, Make.com) and set your trigger (time-based or event-based).",
      "Connect your email/calendar in the integration platform — not in Claude directly.",
      "Review every output before sending; never set auto-send.",
    ],
    scheduleNote: "Claude itself does not have built-in scheduling. Use Zapier or Make.com to trigger Claude on a schedule.",
  },
  chatgpt: {
    sub: "ChatGPT GPT Actions and scheduled tasks via the ChatGPT API or Zapier.",
    steps: [
      "Download the SKILL.md file below.",
      "Go to chatgpt.com, click 'Explore GPTs', and create a new GPT.",
      "Paste the SKILL.md content into the System Prompt field.",
      "Under 'Actions', connect your email or calendar tools (Gmail, Outlook, Google Calendar).",
      "To schedule: use Zapier or Make.com to trigger this GPT on your preferred schedule.",
      "Review every output before it leaves your system; set approvals at each step.",
    ],
    scheduleNote: "ChatGPT GPT Actions can connect to apps. Scheduling requires Zapier or Make.com.",
  },
};

export default function InstallModal({
  slug,
  name,
  onClose,
  onMarkInstalled,
  onTrySample,
}: {
  slug: string;
  name: string;
  onClose: () => void;
  onMarkInstalled: (platform: Platform) => void;
  onTrySample: () => void;
}) {
  const [platform, setPlatform] = useState<Platform>("grok_bot");
  const [marking, setMarking] = useState(false);
  const [markedPlatform, setMarkedPlatform] = useState<Platform | null>(null);
  const setup = PLATFORM_SETUP[platform];

  const skillUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/workflow-templates/${slug}/skill`;

  async function markInstalled() {
    setMarking(true);
    try {
      await api.install.mark(slug, platform);
      setMarkedPlatform(platform);
      onMarkInstalled(platform);
    } catch { /* keep going */ }
    setMarking(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Install ${name}`}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full overflow-y-auto"
        style={{
          maxWidth: "560px", maxHeight: "90vh",
          background: "var(--canvas-1)", borderRadius: "16px",
          border: "1px solid var(--canvas-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--canvas-border)" }}>
          <div>
            <p className="font-mono text-2xs mb-0.5" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>INSTALL WORKFLOW</p>
            <p className="font-extrabold text-base" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>{name}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost text-sm p-2" aria-label="Close">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Platform tabs */}
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--canvas-text)" }}>
              Choose your AI platform
            </p>
            <div className="flex gap-2">
              {(["grok_bot", "claude", "chatgpt"] as Platform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: p === platform ? "rgba(59,107,255,0.12)" : "var(--canvas-2)",
                    border: `1px solid ${p === platform ? "var(--blue)" : "var(--canvas-border)"}`,
                    color: p === platform ? "var(--blue)" : "var(--canvas-text-2)",
                  }}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--canvas-text-3)" }}>{setup.sub}</p>
          </div>

          {/* Download SKILL.md */}
          <div className="rounded-xl p-4" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>STEP 1 — GET THE SKILL FILE</p>
            <p className="text-sm mb-3" style={{ color: "var(--canvas-text-2)" }}>
              Download the <code style={{ fontFamily: "var(--font-mono)", color: "var(--blue)", fontSize: "12px" }}>SKILL.md</code> file and paste its contents into {PLATFORM_LABELS[platform]}.
            </p>
            <a
              href={skillUrl}
              download={`${slug}.skill.md`}
              className="btn-primary text-sm"
              style={{ padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span>↓</span> Download {slug}.skill.md
            </a>
          </div>

          {/* Step-by-step */}
          <div>
            <p className="font-mono text-2xs mb-3" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>STEP-BY-STEP SETUP IN {PLATFORM_LABELS[platform].toUpperCase()}</p>
            <ol className="space-y-2.5">
              {setup.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-xs"
                    style={{ background: "rgba(59,107,255,0.1)", color: "var(--blue)", marginTop: "1px" }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: "var(--canvas-text-2)" }}>{step}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs mt-3" style={{ color: "var(--canvas-text-3)" }}>
              <strong>Approval rule:</strong> {setup.scheduleNote}
            </p>
          </div>

          {/* Mark installed */}
          <div className="rounded-xl p-4" style={{ background: markedPlatform ? "rgba(34,197,94,0.06)" : "var(--canvas-2)", border: `1px solid ${markedPlatform ? "rgba(34,197,94,0.2)" : "var(--canvas-border)"}` }}>
            {markedPlatform ? (
              <p className="text-sm font-semibold" style={{ color: "#16A34A" }}>
                ✓ Marked as installed in {PLATFORM_LABELS[markedPlatform]}
              </p>
            ) : (
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--canvas-text)" }}>
                  Installed and running?
                </p>
                <p className="text-xs mb-3" style={{ color: "var(--canvas-text-3)" }}>
                  Mark this workflow as installed so your progress is tracked.
                </p>
                <button
                  type="button"
                  onClick={markInstalled}
                  disabled={marking}
                  className="btn-secondary text-sm"
                  style={{ padding: "8px 14px" }}
                >
                  {marking ? "Saving…" : `Mark as installed in ${PLATFORM_LABELS[platform]}`}
                </button>
              </div>
            )}
          </div>

          {/* Try with a sample */}
          <div>
            <p className="text-xs mb-2" style={{ color: "var(--canvas-text-3)" }}>
              Want to preview the output first?
            </p>
            <button
              type="button"
              onClick={onTrySample}
              className="btn-ghost text-sm"
            >
              Try with a sample →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
