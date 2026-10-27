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

interface ReadyMadeAlternative { name: string; url: string; note: string }
interface PlatformSetup {
  sub: string;
  readyMade?: ReadyMadeAlternative; // show above manual steps when present
  steps: string[];
  scheduleNote: string;
  claudeZipNote?: string;
}

const PLATFORM_SETUP: Record<Platform, PlatformSetup> = {
  grok_bot: {
    sub: "Grok Bot (x.com/grok) supports a skill library and routine creation via chat. Recommended for ATG workflows.",
    // Note: Grok Bot's pre-built templates exist — admin can add per-workflow alternatives via platformReadyMade field
    steps: [
      "Open Grok Bot at grok.com and sign in with your X Premium account.",
      "Go to the 'Skills' tab in the sidebar. Click 'Add skill' → 'Import from file' and upload your SKILL.md.",
      "Your skill is now saved to your library. Trigger it anytime by typing '/' followed by the skill name in any Grok conversation.",
      "To run it on a schedule: start a chat with Grok and say 'Create a routine that runs [skill name] every [day/week] at [time].' Grok will set up the routine for you.",
      "For the first run, copy the output and verify it looks right before using it. Nothing is sent automatically.",
    ],
    scheduleNote: "Grok Bot routines can run daily or weekly. You create them by talking to Grok in chat — no code needed.",
  },
  claude: {
    sub: "Claude (claude.ai) uses Projects and Skills for persistent instructions. Scheduling requires Zapier or Make.",
    steps: [
      "Open claude.ai and click 'New Project' in the sidebar.",
      "In the Project, click 'Project Settings' → 'Skills' tab → 'Upload ZIP'. Create a ZIP file named after this skill (e.g. lead-follow-up.zip) containing your SKILL.md (renamed to skill.md).",
      "Alternatively: paste the SKILL.md contents into 'Project Instructions' if you don't want to use the Skills tab.",
      "To run on a schedule: connect Claude to Zapier (zapier.com) with a 'Schedule' trigger, then a 'Claude: Send Message' action using the routine prompt from your SKILL.md.",
      "Add your email or calendar as a subsequent step in Zapier — route the output to a draft for your review.",
      "Always review Claude's output before using it. Never configure auto-send.",
    ],
    scheduleNote: "Claude does not have built-in scheduling. Use Zapier or Make.com to trigger Claude on a time-based schedule.",
    claudeZipNote: "Download a Claude-ready ZIP: your SKILL.md is packaged as skill.md inside a folder named after this workflow.",
  },
  chatgpt: {
    sub: "ChatGPT (chatgpt.com) uses custom GPTs and the GPT Store for persistent skills. Scheduled Tasks available for Plus/Team.",
    steps: [
      "Go to chatgpt.com → 'Explore GPTs' → 'Create'. Give your GPT a name matching this workflow.",
      "In the 'Instructions' field, paste the entire System Prompt section from your SKILL.md.",
      "Under 'Actions', you can connect Gmail or Google Calendar using their official schemas (available from platform.openai.com/docs).",
      "To schedule (ChatGPT Plus/Team): open a chat with ChatGPT and ask it to 'Set a scheduled task to run [workflow name] every [day] at [time].' ChatGPT's Tasks feature will handle the timing.",
      "Note: Skills (within GPTs) are available on Business, Enterprise, and Education plans only — not Plus.",
      "Always review the output before using it. Set the GPT to produce a draft, not to send directly.",
    ],
    scheduleNote: "ChatGPT Scheduled Tasks work in the main chat (not inside a GPT). Available for Plus and above. GPT Actions can connect to apps via API.",
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

          {/* Ready-made alternative — shown when available */}
          {setup.readyMade && (
            <div className="rounded-xl p-4" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p className="font-mono text-2xs mb-1" style={{ color: "#16A34A", letterSpacing: "0.08em" }}>READY-MADE ALTERNATIVE</p>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--canvas-text)" }}>{setup.readyMade.name}</p>
              <p className="text-xs mb-2" style={{ color: "var(--canvas-text-2)" }}>{setup.readyMade.note}</p>
              <a
                href={setup.readyMade.url}
                target="_blank" rel="noopener noreferrer"
                className="btn-secondary text-sm"
                style={{ padding: "6px 12px" }}
              >
                Open ready-made version ↗
              </a>
            </div>
          )}

          {/* Step-by-step */}
          <div>
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
              {setup.readyMade ? "OR: MANUAL SETUP IN" : "SETUP IN"} {PLATFORM_LABELS[platform].toUpperCase()}
            </p>
            {setup.claudeZipNote && (
              <p className="text-xs mb-2" style={{ color: "var(--blue)" }}>{setup.claudeZipNote}</p>
            )}
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
              <strong>Schedule note:</strong> {setup.scheduleNote}
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
