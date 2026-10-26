/**
 * Unified skill launcher — shows all available Phase 1 + Phase 2 workflows.
 * Locked workflows (tier below minTier) show an upgrade CTA. No prices hardcoded.
 * Self-serve sees Phase 1 unlocked; Guided sees Phase 1 + 2 unlocked; DFY sees all.
 */
import { useState, useEffect } from "react";
import { workflowTemplatesApi, type WorkflowTemplate } from "@/lib/api";
import { Link } from "wouter";

const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
const TIER_LABELS: Record<string, string> = { NONE: "No plan", SELF_SERVE: "Self-serve", GUIDED: "Guided", WHITE_GLOVE: "Done-for-you" };

type AnySkillKey = string;

interface SkillButton {
  slug: AnySkillKey;
  label: string;
  icon: string;
  minTier: string;
}

const SKILL_BUTTONS: SkillButton[] = [
  // Phase 1 (SELF_SERVE)
  { slug: "follow-up",         label: "Follow-up draft",    icon: "✉",  minTier: "SELF_SERVE" },
  { slug: "inbox-triage",      label: "Inbox triage",       icon: "📥", minTier: "SELF_SERVE" },
  { slug: "review-request",    label: "Review requests",    icon: "⭐", minTier: "SELF_SERVE" },
  { slug: "social-calendar",   label: "Social calendar",    icon: "📅", minTier: "SELF_SERVE" },
  { slug: "seo-audit",         label: "SEO audit",          icon: "🔍", minTier: "SELF_SERVE" },
  // Phase 2 (GUIDED)
  { slug: "money-snapshot",    label: "Money snapshot",     icon: "💰", minTier: "GUIDED" },
  { slug: "booking-flow",      label: "Booking flow",       icon: "📆", minTier: "GUIDED" },
  { slug: "quote-proposal",    label: "Quote / proposal",   icon: "📝", minTier: "GUIDED" },
  { slug: "prospect-research", label: "Prospect research",  icon: "🔎", minTier: "GUIDED" },
  // Phase 3 (WHITE_GLOVE)
  { slug: "faq-support",       label: "FAQ & support",      icon: "💬", minTier: "WHITE_GLOVE" },
  { slug: "agent-pipeline",    label: "Agent pipeline",     icon: "⚙",  minTier: "WHITE_GLOVE" },
];

interface Props {
  clientTier: string;
  activeSkill: string | null;
  onSelectSkill: (slug: string) => void;
}

export default function SkillLauncher({ clientTier, activeSkill, onSelectSkill }: Props) {
  const [dbTemplates, setDbTemplates] = useState<WorkflowTemplate[]>([]);
  const clientTierIdx = TIER_ORDER.indexOf(clientTier);

  useEffect(() => {
    workflowTemplatesApi.list().then(setDbTemplates).catch(() => null);
  }, []);

  // Merge DB-enabled state into buttons
  const buttons = SKILL_BUTTONS.map((btn) => {
    const dbTemplate = dbTemplates.find((t) => t.slug === btn.slug);
    const minTier = dbTemplate?.minTier ?? btn.minTier;
    const minTierIdx = TIER_ORDER.indexOf(minTier);
    const locked = clientTierIdx < minTierIdx;
    return { ...btn, minTier, locked };
  });

  const unlocked = buttons.filter((b) => !b.locked);
  const locked    = buttons.filter((b) =>  b.locked);

  return (
    <div className="mb-5">
      {/* Unlocked workflows */}
      {unlocked.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {unlocked.map((btn) => (
            <button
              key={btn.slug}
              onClick={() => onSelectSkill(btn.slug)}
              className="btn-secondary text-xs py-1.5 px-3 transition-all"
              style={{
                background: activeSkill === btn.slug ? "rgba(59,107,255,0.08)" : undefined,
                borderColor: activeSkill === btn.slug ? "var(--blue)" : undefined,
              }}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* Locked workflows — shown collapsed with upgrade CTA */}
      {locked.length > 0 && (
        <details>
          <summary className="cursor-pointer font-mono text-2xs select-none" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>
            + {locked.length} more workflow{locked.length !== 1 ? "s" : ""} (upgrade to unlock)
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {locked.map((btn) => (
              <div key={btn.slug} className="relative">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-not-allowed select-none"
                  style={{ border: "1px solid var(--canvas-border)", color: "var(--canvas-text-3)", background: "var(--canvas-2)" }}
                  title={`Requires ${TIER_LABELS[btn.minTier] ?? btn.minTier} plan`}
                >
                  🔒 {btn.label}
                  <span className="font-mono text-2xs opacity-60">{TIER_LABELS[btn.minTier] ?? btn.minTier}</span>
                </span>
              </div>
            ))}
            <Link to="/#tiers">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(59,107,255,0.08)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.2)" }}>
                View plans →
              </span>
            </Link>
          </div>
        </details>
      )}
    </div>
  );
}
