/**
 * Unified skill launcher with tier-aware gating and personalized ordering.
 *
 * When BILLING_ENABLED is not "true" (test mode), ALL workflows are unlocked
 * and a banner says so. This matches the server-side bypass in lib/access.ts.
 *
 * Personalized slugs (from intake personalization) are featured first.
 * Locked workflows show with sufficient contrast (canvas-text-2, not text-3).
 */
import { Link } from "wouter";

const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
const TIER_LABELS: Record<string, string> = {
  NONE: "No plan", SELF_SERVE: "Self-serve", GUIDED: "Guided", WHITE_GLOVE: "Done-for-you",
};

interface SkillButton {
  slug: string;
  label: string;
  icon: string;
  minTier: string;
}

const ALL_SKILL_BUTTONS: SkillButton[] = [
  { slug: "inbox-triage",      label: "Inbox triage",       icon: "📥", minTier: "SELF_SERVE" },
  { slug: "review-request",    label: "Review requests",    icon: "⭐", minTier: "SELF_SERVE" },
  { slug: "social-calendar",   label: "Social calendar",    icon: "📅", minTier: "SELF_SERVE" },
  { slug: "seo-audit",         label: "SEO audit",          icon: "🔍", minTier: "SELF_SERVE" },
  { slug: "money-snapshot",    label: "Money snapshot",     icon: "💰", minTier: "GUIDED" },
  { slug: "booking-flow",      label: "Booking flow",       icon: "📆", minTier: "GUIDED" },
  { slug: "quote-proposal",    label: "Quote / proposal",   icon: "📝", minTier: "GUIDED" },
  { slug: "prospect-research", label: "Prospect research",  icon: "🔎", minTier: "GUIDED" },
  { slug: "faq-support",       label: "FAQ & support",      icon: "💬", minTier: "WHITE_GLOVE" },
  { slug: "agent-pipeline",    label: "Agent pipeline",     icon: "⚙",  minTier: "WHITE_GLOVE" },
];

export function skillUnlocked(slug: string, clientTier: string, testMode: boolean): boolean {
  const btn = ALL_SKILL_BUTTONS.find((item) => item.slug === slug);
  if (!btn) return false;
  if (testMode) return true;
  return TIER_ORDER.indexOf(clientTier) >= TIER_ORDER.indexOf(btn.minTier);
}

interface Props {
  clientTier: string;
  testMode?: boolean;
  personalizedSlugs?: string[];
  activeSkill: string | null;
  onSelectSkill: (slug: string) => void;
}

export default function SkillLauncher({
  clientTier,
  testMode = false,
  personalizedSlugs = [],
  activeSkill,
  onSelectSkill,
}: Props) {
  const clientTierIdx = TIER_ORDER.indexOf(clientTier);

  // In test mode every workflow is unlocked
  const isLocked = (btn: SkillButton): boolean => {
    if (testMode) return false;
    return clientTierIdx < TIER_ORDER.indexOf(btn.minTier);
  };

  // Order: personalizedSlugs first, then the rest
  const ordered = [
    ...personalizedSlugs.map((slug) => ALL_SKILL_BUTTONS.find((b) => b.slug === slug)).filter(Boolean) as SkillButton[],
    ...ALL_SKILL_BUTTONS.filter((b) => !personalizedSlugs.includes(b.slug)),
  ];

  const unlocked = ordered.filter((b) => !isLocked(b));
  const locked   = ordered.filter((b) =>  isLocked(b));
  const featured = personalizedSlugs.slice(0, 3);

  return (
    <div className="mb-5">
      {/* Test-mode notice */}
      {testMode && (
        <div className="rounded-lg px-3 py-1.5 mb-3 text-xs flex items-center gap-2"
          style={{ background: "rgba(59,107,255,0.08)", border: "1px solid rgba(59,107,255,0.2)", color: "var(--blue-btn)" }}>
          <span className="font-mono font-bold" style={{ letterSpacing: "0.06em" }}>TEST MODE</span>
          <span>All workflows unlocked — set BILLING_ENABLED=true in production to enforce tier gating.</span>
        </div>
      )}

      {/* Unlocked workflows */}
      {unlocked.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {unlocked.map((btn) => {
            const isFeatured = featured.includes(btn.slug);
            const isActive   = activeSkill === btn.slug;
            return (
              <button
                key={btn.slug}
                type="button"
                onClick={() => onSelectSkill(btn.slug)}
                className="transition-all"
                style={{
                  display:        "inline-flex",
                  alignItems:     "center",
                  gap:            "5px",
                  padding:        isFeatured ? "8px 14px" : "7px 12px",
                  borderRadius:   "8px",
                  fontSize:       "13px",
                  fontWeight:     isFeatured ? 600 : 500,
                  cursor:         "pointer",
                  border:         `${isFeatured ? 2 : 1}px solid ${isActive ? "var(--blue)" : isFeatured ? "var(--blue)" : "var(--canvas-border)"}`,
                  background:     isActive
                    ? "rgba(59,107,255,0.10)"
                    : isFeatured
                    ? "rgba(59,107,255,0.06)"
                    : "var(--canvas-1)",
                  color:          isActive || isFeatured ? "var(--blue-btn)" : "var(--canvas-text)",
                  // WCAG AA: canvas-text (#0A0A0B) on canvas-1 (#FFFFFF) = 21:1 ✅
                  //           blue-btn (#2557E8) on canvas-1 = contextual, large text ✅
                }}
                aria-pressed={isActive}
              >
                <span aria-hidden="true">{btn.icon}</span>
                {btn.label}
                {isFeatured && !isActive && (
                  <span
                    className="font-mono"
                    style={{ fontSize: "10px", letterSpacing: "0.06em", color: "var(--blue)", opacity: 0.7 }}
                  >★</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Locked workflows — contrast-safe */}
      {locked.length > 0 && (
        <details>
          <summary
            className="cursor-pointer select-none text-xs font-medium"
            style={{ color: "var(--canvas-text-2)", letterSpacing: "0.02em" }}
          >
            + {locked.length} more workflow{locked.length !== 1 ? "s" : ""} (upgrade to unlock)
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {locked.map((btn) => (
              <span
                key={btn.slug}
                className="skill-btn-locked"
                title={`Requires ${TIER_LABELS[btn.minTier] ?? btn.minTier}`}
              >
                <span className="lock-icon">🔒</span>
                {btn.label}
                <span
                  className="font-mono"
                  style={{ fontSize: "10px", letterSpacing: "0.06em", color: "var(--canvas-text-2)", opacity: 0.7 }}
                >
                  {TIER_LABELS[btn.minTier] ?? btn.minTier}
                </span>
              </span>
            ))}
            <Link to="/#tiers">
              <span
                style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "7px 12px", borderRadius: "8px", fontSize: "12px",
                  fontWeight: 600, cursor: "pointer",
                  background: "rgba(59,107,255,0.08)",
                  color: "var(--blue-btn)",   // 4.9:1 on canvas-1 ✅
                  border: "1px solid rgba(59,107,255,0.2)",
                }}
              >
                View plans →
              </span>
            </Link>
          </div>
        </details>
      )}
    </div>
  );
}
