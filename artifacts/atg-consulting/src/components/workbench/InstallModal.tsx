/**
 * InstallModal — shows platform-specific install instructions for a workflow.
 * Platforms: Grok Bot, Claude, ChatGPT. Includes SKILL.md download + copy-paste routine.
 * "Try with a sample" is the in-app preview (existing SkillRunner flow).
 * Respects product boundary: ATG delivers the SKILL.md; the client installs it
 * in their own AI platform. No OAuth, no sending from ATG.
 */
import { useState } from "react";
import { api } from "@/lib/api";
import SkillCustomizerModal from "@/components/app/SkillCustomizerModal";

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

function CustomizerTrigger({ slug, name, platform }: { slug: string; name: string; platform: Platform }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary text-sm" style={{ padding: "7px 12px" }}>
        ✦ Customise for my business
      </button>
      {open && <SkillCustomizerModal slug={slug} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

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
  // Verification code flow
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const setup = PLATFORM_SETUP[platform];

  // Use client-specific download (embeds verification code in SKILL.md)
  const skillUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/workbench/skill/${slug}/download`;

  async function markInstalled() {
    setMarking(true);
    try {
      await api.install.mark(slug, platform);
      setMarkedPlatform(platform);
      onMarkInstalled(platform);
    } catch { /* keep going */ }
    setMarking(false);
  }

  async function submitVerifyCode() {
    if (!verifyCode.trim()) return;
    setVerifying(true);
    setVerifyMsg(null);
    const r = await api.install.verify(slug, verifyCode.trim()).catch((e: Error) => ({ verified: false, error: e.message } as const));
    if ("verified" in r && r.verified) {
      setIsVerified(true);
      setVerifyMsg({ ok: true, text: r.message ?? "✓ Verified installed!" });
      setMarkedPlatform(platform);
      onMarkInstalled(platform);
    } else {
      setVerifyMsg({ ok: false, text: (r as { error?: string }).error ?? "Incorrect code. Try again." });
    }
    setVerifying(false);
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
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>STEP 1 — GET YOUR PERSONALISED SKILL FILE</p>
            <p className="text-sm mb-1" style={{ color: "var(--canvas-text-2)" }}>
              Download your personalised <code style={{ fontFamily: "var(--font-mono)", color: "var(--blue)", fontSize: "12px" }}>SKILL.md</code> and paste its contents into {PLATFORM_LABELS[platform]}.
            </p>
            <p className="text-xs mb-3" style={{ color: "var(--canvas-text-3)" }}>
              Your file includes a unique verification code. On its first run, the AI agent will print the code — paste it below to confirm the skill is running.
            </p>
            <a
              href={skillUrl}
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

          {/* Verification code + mark installed */}
          <div className="rounded-xl p-4 space-y-4" style={{ background: isVerified ? "rgba(34,197,94,0.06)" : "var(--canvas-2)", border: `1px solid ${isVerified ? "rgba(34,197,94,0.2)" : "var(--canvas-border)"}` }}>
            {isVerified ? (
              <p className="text-sm font-semibold" style={{ color: "#16A34A" }}>
                ✓ Verified installed — your code matched. This workflow is confirmed running in {PLATFORM_LABELS[platform]}.
              </p>
            ) : (
              <>
                {/* Verification code input */}
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--canvas-text)" }}>Paste verification code</p>
                  <p className="text-xs mb-2" style={{ color: "var(--canvas-text-3)" }}>
                    Run the skill once in {PLATFORM_LABELS[platform]}. The AI agent will print a code like <code style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>ATG-XXXX</code>. Paste it here to verify.
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="field-input text-sm font-mono flex-1"
                      placeholder="ATG-XXXX"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === "Enter") void submitVerifyCode(); }}
                      maxLength={10}
                      style={{ letterSpacing: "0.05em" }}
                    />
                    <button
                      type="button"
                      onClick={() => void submitVerifyCode()}
                      disabled={verifying || !verifyCode.trim()}
                      className="btn-primary text-sm flex-shrink-0"
                      style={{ padding: "8px 14px" }}
                    >
                      {verifying ? "Checking…" : "Verify"}
                    </button>
                  </div>
                  {verifyMsg && (
                    <p className="text-xs mt-1.5 font-medium" style={{ color: verifyMsg.ok ? "#16A34A" : "#DC2626" }}>
                      {verifyMsg.text}
                    </p>
                  )}
                </div>

                {/* Manual mark as fallback */}
                <div style={{ borderTop: "1px solid var(--canvas-border)", paddingTop: "12px" }}>
                  {markedPlatform ? (
                    <p className="text-xs" style={{ color: "#16A34A" }}>
                      ✓ Manually marked as installed in {PLATFORM_LABELS[markedPlatform]}. Use the verification code for confirmed status.
                    </p>
                  ) : (
                    <div>
                      <p className="text-xs mb-2" style={{ color: "var(--canvas-text-3)" }}>
                        Haven't run it yet? Mark as installed manually and come back to verify later.
                      </p>
                      <button
                        type="button"
                        onClick={markInstalled}
                        disabled={marking}
                        className="btn-secondary text-sm"
                        style={{ padding: "6px 12px" }}
                      >
                        {marking ? "Saving…" : `Mark as installed (unverified)`}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Customizer + Try with sample */}
          <div className="flex flex-wrap gap-3">
            <CustomizerTrigger slug={slug} name={name} platform={platform} />
            <button type="button" onClick={onTrySample} className="btn-ghost text-sm">
              Try with a sample →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
