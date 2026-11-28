import { useEffect, useState, type ReactNode } from "react";
import { useUser } from "@clerk/react";
import { Redirect } from "wouter";
import { api, portalApi } from "@/lib/api";

export default function IntakeEntry({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const query = new URLSearchParams(window.location.search);
  const deliberateEdit = query.get("edit") === "true" || query.has("resume");
  const [continueAsGuest, setContinueAsGuest] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (isLoaded) return;
    const timeout = window.setTimeout(() => setContinueAsGuest(true), 3500);
    return () => window.clearTimeout(timeout);
  }, [isLoaded]);
  useEffect(() => {
    if (continueAsGuest || !isLoaded || !isSignedIn || deliberateEdit) return;
    let active = true;
    setReady(false); setDestination(null); setError("");
    void (async () => {
      const account = await api.account.get();
      if (!active) return;
      if (account.isAdmin) { setDestination("/auth/continue"); return; }
      const status = await portalApi.status();
      if (!active) return;
      if (status.hasClient && status.hasIntake) setDestination("/app");
      else setReady(true);
    })().catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not check your account. Please try again."); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, user?.id, deliberateEdit, retry, continueAsGuest]);
  // Invite/member routes bypass this wrapper; explicit edits/resumes stay intentional.
  if (continueAsGuest || deliberateEdit || (isLoaded && !isSignedIn)) return <>{children}</>;
  if (destination) return <Redirect to={destination} />;
  if (ready) return <>{children}</>;
  return <main className="max-w-xl mx-auto px-5 py-16 text-center">
    {error ? <><p role="alert" className="mb-4">{error}</p><button className="btn-primary" onClick={() => setRetry((v) => v + 1)}>Try again</button></> : <p role="status">Checking your account…</p>}
  </main>;
}
