/**
 * Account page — profile basics, intake summary + edit, tier/billing, change history.
 * Profile image is hidden (Clerk avatar renders oversized; show name/initials instead).
 * Uses api.client.me() for tier/digest, clientIntakeApi for intake data.
 * Resilient to network errors: shows a clear message rather than crashing.
 */
import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/react";
import { Link } from "wouter";
import AppShell from "@/components/app/AppShell";
import { useAccount } from "@/lib/useAccount";
import { api, clientIntakeApi, type IntakeSummary, billing } from "@/lib/api";
import DaySetup from "@/components/day/DaySetup";

const TIER_LABELS: Record<string, string> = {
  NONE: "No plan yet",
  SELF_SERVE: "Self-serve",
  GUIDED: "Guided",
  WHITE_GLOVE: "White Glove",
};

const HELP_STYLE_LABELS: Record<string, string> = {
  self_serve: "Self-serve", guided: "Guided",
  done_for_you: "Done-for-you", not_sure: "Not sure",
};

const AI_LABELS = ["Never used AI tools", "Asks questions occasionally", "Uses AI weekly", "Built automations", "Runs agents daily"];

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
        <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>{title}</p>
        {badge && <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "rgba(59,107,255,0.08)", color: "var(--blue)", letterSpacing: "0.06em" }}>{badge}</span>}
      </div>
      <div className="p-5" style={{ background: "var(--canvas-1)" }}>
        {children}
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { account, loading: accountLoading, error: accountError } = useAccount();
  const [intake, setIntake] = useState<IntakeSummary | null | undefined>(undefined);
  const [history, setHistory] = useState<{ id: string; createdAt: string; helpStyle: string }[]>([]);
  const [digestOptIn, setDigestOptIn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingEnabled] = useState(typeof window !== "undefined" && import.meta.env.VITE_BILLING_ENABLED === "true");

  const tier = account?.tier ?? "NONE";

  // Load intake data
  useEffect(() => {
    Promise.all([
      clientIntakeApi.latest().catch(() => null),
      clientIntakeApi.history().catch(() => []),
    ]).then(([l, h]) => {
      setIntake(l);
      setHistory(h as { id: string; createdAt: string; helpStyle: string }[]);
    });
  }, []);

  useEffect(() => {
    if (account) setDigestOptIn(account.digestEmailOptIn);
  }, [account]);

  async function saveDigest(val: boolean) {
    setSaving(true);
    await api.client.updateAccount({ digestEmailOptIn: val }).catch(() => null);
    setDigestOptIn(val);
    setSaving(false);
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const { url } = await billing.portal();
      if (url) window.location.href = url;
    } catch { /* swallow */ }
    setPortalLoading(false);
  }

  const initials = (user?.fullName ?? account?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Parse intake answers
  const intakeAnswers: Record<string, unknown> = (() => {
    if (!intake?.answers) return {};
    try { return JSON.parse(intake.answers) as Record<string, unknown>; } catch { return {}; }
  })();

  return (
    <AppShell>
      <div className="max-w-content mx-auto space-y-5">

        {/* Header — no profile image; initials only */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold flex-shrink-0"
            style={{ background: "rgba(59,107,255,0.12)", color: "var(--blue-btn)", border: "1px solid rgba(59,107,255,0.25)", fontSize: "18px" }}
            aria-label="Account initials"
          >
            {initials}
          </div>
          <div>
            <p className="font-extrabold text-xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
              {account?.name ?? user?.fullName ?? "Your account"}
            </p>
            <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
              {account?.email ?? user?.primaryEmailAddress?.emailAddress ?? "—"}
            </p>
          </div>
        </div>

        {/* Network error — clear message instead of crash */}
        {accountError && (
          <div className="rounded-xl p-4" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)" }}>
            <p className="text-sm font-semibold mb-0.5" style={{ color: "#DC2626" }}>
              Could not load your account data
            </p>
            <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>
              {accountError.includes("failed") || accountError.includes("Failed")
                ? "The API server is not reachable from this browser. Check that VITE_PROXY_TARGET is set in Replit Secrets to the API workflow URL."
                : accountError}
            </p>
          </div>
        )}

        {/* Plan / tier */}
        <Section title="Your plan" badge={billingEnabled ? "BILLING ACTIVE" : "TEST MODE"}>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>
                {TIER_LABELS[tier] ?? tier}
              </p>
              {!billingEnabled && (
                <p className="text-xs mt-0.5" style={{ color: "var(--canvas-text-3)" }}>
                  BILLING_ENABLED is not set — all workflows unlocked for testing.
                </p>
              )}
            </div>
            {tier === "NONE" && (
              <Link to="/#tiers"><span className="btn-secondary text-sm py-2 px-3">View plans</span></Link>
            )}
          </div>
          {billingEnabled && tier !== "NONE" && (
            <div className="space-y-2">
              <button
                onClick={openBillingPortal}
                disabled={portalLoading}
                className="btn-secondary text-sm py-2 px-3"
              >
                {portalLoading ? "Opening…" : "Manage billing & invoices"}
              </button>
              <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
                See our <Link to="/refunds"><span className="underline" style={{ color: "var(--blue-btn)" }}>Refund Policy</span></Link> for cancellation terms.
              </p>
            </div>
          )}
          {!billingEnabled && (
            <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
              Set <code style={{ fontFamily: "var(--font-mono)" }}>BILLING_ENABLED=true</code> in Replit Secrets and configure Stripe to enable billing.
            </p>
          )}
        </Section>

        {/* Intake summary */}
        <Section title="Your intake" badge={intake ? `Updated ${new Date(intake.createdAt).toLocaleDateString()}` : undefined}>
          {intake === undefined ? (
            <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
          ) : !intake ? (
            <div>
              <p className="text-sm mb-3" style={{ color: "var(--canvas-text-2)" }}>
                No intake on file. Complete the intake form to personalise your Workbench.
              </p>
              <Link to="/start"><span className="btn-primary text-sm py-2 px-4">Start intake →</span></Link>
            </div>
          ) : (
            <div>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {[
                  ["AI comfort", AI_LABELS[intake.aiComfort] ?? `Level ${intake.aiComfort}`],
                  ["Hours lost / week", `~${intake.hoursLost}h`],
                  ["Preferred help", HELP_STYLE_LABELS[intake.helpStyle] ?? intake.helpStyle],
                  ["Areas", (() => { try { return (JSON.parse(intake.areas) as string[]).map((a) => a.replace("_", " ")).join(", "); } catch { return "—"; } })()],
                  ["Budget", intakeAnswers.toolBudget as string ?? "—"],
                  ["Current software", intakeAnswers.currentSoftware as string ?? "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="font-mono text-2xs mb-0.5" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>{(label as string).toUpperCase()}</p>
                    <p className="text-sm font-medium" style={{ color: "var(--canvas-text)" }}>{value as string}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Link to="/start">
                  <span className="btn-secondary text-sm py-2 px-3">Edit my intake →</span>
                </Link>
                <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
                  Submitting a new intake re-personalises your Workbench.
                </p>
              </div>
            </div>
          )}
        </Section>

        <Section title="Your day">
          <DaySetup />
        </Section>

        {/* Digest preference */}
        <Section title="Email digest">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>Daily digest emails</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--canvas-text-2)" }}>
                Receive your daily AI digest when Shea publishes it.
              </p>
            </div>
            <button
              onClick={() => saveDigest(!(digestOptIn ?? true))}
              disabled={saving || digestOptIn === null}
              aria-pressed={digestOptIn ?? true}
              className="relative flex-shrink-0"
              style={{
                width: "40px", height: "24px", borderRadius: "12px",
                background: (digestOptIn ?? true) ? "var(--blue-btn)" : "var(--canvas-border)",
                border: "none", cursor: "pointer", padding: 0, transition: "background 200ms",
              }}
            >
              <span
                style={{
                  position: "absolute", top: "2px",
                  left: (digestOptIn ?? true) ? "18px" : "2px",
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: "#fff", transition: "left 200ms", display: "block",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
        </Section>

        {/* Change history */}
        {history.length > 1 && (
          <Section title="Intake history">
            <ul className="space-y-2">
              {history.map((h, i) => (
                <li key={h.id} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: i === 0 ? "rgba(59,107,255,0.08)" : "var(--canvas-2)", color: i === 0 ? "var(--blue)" : "var(--canvas-text-3)", letterSpacing: "0.06em" }}>
                    {i === 0 ? "CURRENT" : `V${history.length - i}`}
                  </span>
                  <span style={{ color: "var(--canvas-text-2)" }}>
                    {new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span style={{ color: "var(--canvas-text-3)" }}>
                    {HELP_STYLE_LABELS[h.helpStyle] ?? h.helpStyle}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Sign out */}
        <Section title="Session">
          <button onClick={() => signOut()} className="btn-secondary text-sm py-2 px-4">
            Sign out
          </button>
        </Section>
      </div>
    </AppShell>
  );
}
