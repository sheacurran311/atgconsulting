/**
 * IntakeGate — wraps the client portal.
 * If the signed-in user has no intake linked to their account, they are shown
 * a prompt to complete the intake first. The email and name are pre-filled from
 * their Clerk account so they don't have to type them again.
 *
 * The gate also exposes portal status (testMode, personalizedSlugs, tier) to
 * child components via the returned context.
 */
import { useState, useEffect, createContext, useContext } from "react";
import { Link, Redirect } from "wouter";
import { useUser } from "@clerk/react";
import { portalApi, type PortalStatus } from "@/lib/api";
import LogoMark from "@/components/LogoMark";
import { useAccount } from "@/lib/useAccount";
import { syncSignedInUser, wantsClientView } from "@/lib/viewMode";

interface PortalCtx extends PortalStatus {
  refetch: () => void;
}

const PortalContext = createContext<PortalCtx | null>(null);

export function usePortal(): PortalCtx | null {
  return useContext(PortalContext);
}

interface Props { children: React.ReactNode }

export function NeedsIntake() {
  return (
    <div className="rounded-2xl p-10 text-center" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <p className="font-bold mb-2" style={{ color: "var(--canvas-text)" }}>Complete the intake first</p>
      <p className="text-sm mb-5" style={{ color: "var(--canvas-text-2)" }}>
        Your portal opens once the intake is linked to this account.
      </p>
      <Link to="/intake">
        <span className="btn-primary">Start the intake</span>
      </Link>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--canvas)" }}>
      <span className="font-mono text-xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>LOADING…</span>
    </div>
  );
}

export default function IntakeGate({ children }: Props) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { account, loading: accountLoading } = useAccount();
  const [status, setStatus] = useState<PortalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<boolean | null>(null);

  if (user?.id) syncSignedInUser(user.id);

  function fetchStatus() {
    setLoading(true);
    portalApi.status()
      .then(setStatus)
      .catch(() => null)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isLoaded && isSignedIn) fetchStatus();
    else if (isLoaded) setLoading(false);
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!account?.isAdmin) {
      setImpersonating(false);
      return;
    }
    let cancelled = false;
    fetch("/api/admin/impersonate/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() as Promise<{ active?: boolean }> : { active: false }))
      .then((d) => { if (!cancelled) setImpersonating(!!d.active); })
      .catch(() => { if (!cancelled) setImpersonating(false); });
    return () => { cancelled = true; };
  }, [account?.isAdmin]);

  const resolvingAdmin = !!account?.isAdmin && impersonating === null;
  if (!isLoaded || (isSignedIn && accountLoading) || resolvingAdmin) {
    return <LoadingScreen />;
  }

  // ADMIN_EMAILS is applied on the API. Send that account to the console
  // unless they are viewing a client, or they opened the client portal on purpose.
  if (account?.isAdmin && !impersonating && !wantsClientView()) {
    return <Redirect to="/admin" />;
  }

  if (loading) return <LoadingScreen />;

  // User has signed in but has no client profile or intake linked to their account
  if (status && (!status.hasClient || !status.hasIntake)) {
    const { email, name } = status.intakePrefill;
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (name)  params.set("name", name);
    params.set("return", "/app");

    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--canvas)" }}>
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <LogoMark variant="light" size={44} className="mx-auto mb-4" />
            <h1 className="font-extrabold text-2xl mb-2" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>
              One quick step first
            </h1>
            <p className="text-base" style={{ color: "var(--canvas-text-2)" }}>
              Complete the 2-minute intake so we can personalise your Workbench — which workflows to start with, which tools to use, and what to do first.
            </p>
          </div>

          <div
            className="rounded-2xl p-6 text-center"
            style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}
          >
            <p className="font-mono text-2xs mb-4" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
              {email ? `Pre-filled with ${email}` : "Free · no payment needed"}
            </p>
            <Link to={`/start?${params.toString()}`}>
              <span
                className="btn-primary w-full justify-center"
                style={{ display: "flex", fontSize: "15px", padding: "13px 24px" }}
              >
                Start the intake →
              </span>
            </Link>
            <p className="text-xs mt-4" style={{ color: "var(--canvas-text-3)" }}>Takes about 2 minutes. Nothing is charged.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PortalContext.Provider value={status ? { ...status, refetch: fetchStatus } : null}>
      {children}
    </PortalContext.Provider>
  );
}
