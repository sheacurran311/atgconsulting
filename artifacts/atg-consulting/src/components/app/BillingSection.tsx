/**
 * Billing section — shown on Account page when VITE_BILLING_ENABLED=true.
 * Prices shown as [$ placeholder] unless fetched from Stripe.
 * Checkout redirects to Stripe-hosted page; nothing handled client-side.
 */
import { useState, useEffect } from "react";
import { billing, type ClientProfile } from "@/lib/api";

const TIER_LABELS: Record<string, string> = {
  NONE: "No plan", SELF_SERVE: "Self-serve", GUIDED: "Guided", WHITE_GLOVE: "White Glove",
};

const CHECKOUT_OPTIONS = [
  {
    tier: "SELF_SERVE" as const,
    label: "Self-serve",
    desc: "Personalised tool plan + setup guide + email support",
    price: "[$ placeholder]",
  },
  {
    tier: "GUIDED" as const,
    label: "Guided",
    desc: "Package of 1:1 build sessions with Shea",
    price: "[$ placeholder]",
  },
  {
    tier: "WHITE_GLOVE" as const,
    label: "Done-for-you",
    desc: "Setup fee + monthly — requires an approved application",
    price: "[$ placeholder]",
  },
];

interface Props { account: ClientProfile }

export default function BillingSection({ account }: Props) {
  const billingEnabled = import.meta.env.VITE_BILLING_ENABLED === "true";
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ hasCustomer: boolean; hasSubscription: boolean } | null>(null);

  useEffect(() => {
    if (!billingEnabled) return;
    billing.info().then((d) => setInfo(d)).catch(() => null);
  }, [billingEnabled]);

  if (!billingEnabled) {
    return (
      <div className="rounded-xl p-6" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
        <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>BILLING</p>
        <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
          Billing is managed by Shea. Contact{" "}
          <a href="mailto:shea@atgconsulting.io" className="underline" style={{ color: "var(--blue)" }}>
            shea@atgconsulting.io
          </a>{" "}
          for pricing.
        </p>
      </div>
    );
  }

  async function startCheckout(tier: "SELF_SERVE" | "GUIDED" | "WHITE_GLOVE") {
    setCheckingOut(tier);
    setError(null);
    try {
      const { url } = await billing.checkout(tier);
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
    } finally {
      setCheckingOut(null);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { url } = await billing.portal();
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Portal failed.");
    } finally {
      setPortalLoading(false);
    }
  }

  const currentTier = account.tier;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <div className="px-6 py-4" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>BILLING · TEST MODE</p>
        <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>
          Current plan: {TIER_LABELS[currentTier] ?? currentTier}
        </p>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }} role="alert">
            {error}
          </div>
        )}

        {/* Upgrade options */}
        {CHECKOUT_OPTIONS.filter((o) => o.tier !== currentTier).map((opt) => (
          <div key={opt.tier} className="flex items-center justify-between gap-4 p-4 rounded-lg" style={{ border: "1px solid var(--canvas-border)" }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{opt.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--canvas-text-2)" }}>{opt.desc}</p>
              <p className="font-mono text-xs mt-1" style={{ color: "var(--blue)" }}>{opt.price}</p>
            </div>
            <button
              onClick={() => startCheckout(opt.tier)}
              disabled={checkingOut === opt.tier}
              className="btn-primary text-sm flex-shrink-0"
              style={{ padding: "8px 14px" }}
            >
              {checkingOut === opt.tier ? "…" : currentTier === "NONE" ? "Get started" : "Upgrade"}
            </button>
          </div>
        ))}

        {/* Customer portal */}
        {info?.hasCustomer && (
          <div className="pt-2" style={{ borderTop: "1px solid var(--canvas-border)" }}>
            <button onClick={openPortal} disabled={portalLoading} className="btn-secondary text-sm">
              {portalLoading ? "Opening…" : "Manage billing & invoices"}
            </button>
          </div>
        )}

        <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
          Prices shown as [$ placeholder] until configured. All payments processed by Stripe.
        </p>
      </div>
    </div>
  );
}
