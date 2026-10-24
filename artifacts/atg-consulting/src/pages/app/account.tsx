import { useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import AppShell from "@/components/app/AppShell";
import { useAccount } from "@/lib/useAccount";
import { api } from "@/lib/api";
import BillingSection from "@/components/app/BillingSection";

const TIER_LABELS: Record<string, string> = { NONE: "No plan yet", SELF_SERVE: "Self-serve", GUIDED: "Guided", WHITE_GLOVE: "White Glove" };
const BOOKING_URL = typeof window !== "undefined" ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book") : "#book";

export default function AccountPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { account, loading, error } = useAccount();
  const [digestOptIn, setDigestOptIn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveDigestPreference(val: boolean) {
    setSaving(true);
    await api.client.updateAccount({ digestEmailOptIn: val }).catch(() => null);
    setDigestOptIn(val);
    setSaving(false);
  }

  const effectiveDigest = digestOptIn ?? account?.digestEmailOptIn ?? true;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <p className="section-eyebrow mb-1">Client portal</p>
          <h1 className="text-2xl font-extrabold text-canvas-text">Account</h1>
        </div>

        {loading && <p className="text-canvas-text">Loading…</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {user && (
          <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-6">
            <p className="text-xs font-bold text-blue tracking-widest uppercase mb-3">Profile</p>
            <div className="flex items-center gap-4">
              {user.imageUrl && <img src={user.imageUrl} alt={user.fullName ?? "Profile"} className="w-12 h-12 rounded-full object-cover" />}
              <div>
                <p className="font-bold text-canvas-text">{user.fullName ?? account?.name ?? "—"}</p>
                <p className="text-canvas-text text-sm">{user.primaryEmailAddress?.emailAddress ?? account?.email ?? "—"}</p>
              </div>
            </div>
          </div>
        )}

        {account && (
          <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-6">
            <p className="text-xs font-bold text-blue tracking-widest uppercase mb-3">Your plan</p>
            <p className="text-xl font-extrabold text-canvas-text">{TIER_LABELS[account.tier] ?? account.tier}</p>
            {account.tier === "NONE" && (
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">Book 1:1 with Shea</a>
                <a href="/#tiers" className="btn-secondary text-sm">View plans</a>
              </div>
            )}
            <p className="text-canvas-text text-xs mt-4">Billing is managed by Shea. Contact <a href="mailto:shea@atgconsulting.io" className="underline">shea@atgconsulting.io</a> for changes.</p>
          </div>
        )}

        {/* Digest preference */}
        <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-6">
          <p className="text-xs font-bold text-blue tracking-widest uppercase mb-3">Email digest</p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-canvas-text text-sm">Daily digest emails</p>
              <p className="text-canvas-text text-xs mt-0.5">Receive your daily AI digest when Shea publishes it.</p>
            </div>
            <button
              onClick={() => saveDigestPreference(!effectiveDigest)}
              disabled={saving}
              aria-pressed={effectiveDigest}
              className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue ${effectiveDigest ? "bg-blue" : "bg-canvas-2"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-canvas-1 rounded-full shadow transition-transform ${effectiveDigest ? "translate-x-4" : ""}`} />
            </button>
          </div>
        </div>

        {/* Billing */}
        {account && <BillingSection account={account} />}

        {/* Sign out */}
        <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-6">
          <p className="text-xs font-bold text-blue tracking-widest uppercase mb-3">Session</p>
          <button
            onClick={() => signOut()}
            className="btn-secondary text-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    </AppShell>
  );
}
