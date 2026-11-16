import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { Redirect } from "wouter";
import { api } from "@/lib/api";
import { clearClientView } from "@/lib/viewMode";

// A fresh sign-in resolves the server role instead of returning to a stale intake URL.
export default function AccountLanding() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [destination, setDestination] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    setDestination(null); setError("");
    void (async () => {
      const account = await api.account.get();
      if (!active) return;
      clearClientView();
      if (account.isAdmin) {
        // Client View is deliberate during a session, never the default after login.
        const response = await fetch("/api/admin/impersonate", { method: "DELETE", credentials: "include" });
        if (!response.ok) throw new Error("Could not return to admin view. Please try again.");
      }
      if (active) setDestination(account.isAdmin ? "/admin/today" : "/app");
    })().catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not open your account. Please try again."); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, user?.id, retry]);
  if (isLoaded && !isSignedIn) return <Redirect to="/sign-in" />;
  if (destination) return <Redirect to={destination} />;
  return <main className="max-w-xl mx-auto px-5 py-16 text-center">
    {error ? <><p role="alert" className="mb-4">{error}</p><button className="btn-primary" onClick={() => setRetry((v) => v + 1)}>Try again</button></> : <p role="status">Opening your dashboard…</p>}
  </main>;
}
