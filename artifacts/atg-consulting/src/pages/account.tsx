import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { Redirect } from "wouter";
import { basePath } from "@/lib/clerk";
import type { AccountProfile } from "@workspace/api-client-react";

export default function AccountPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setAccount(null);
    setError("");
    if (!isLoaded || !isSignedIn) return;
    const controller = new AbortController();
    fetch(`${basePath}/api/account`, { signal: controller.signal, credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired. Please sign out and sign in again." : "Your account could not be loaded. Please try again.");
        return response.json() as Promise<AccountProfile>;
      })
      .then(setAccount)
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [isLoaded, isSignedIn, user?.id, attempt]);

  if (!isLoaded) return <p role="status" className="p-12 text-center text-navy">Loading your account…</p>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-navy-50 px-4 py-14">
      <div className="mx-auto max-w-3xl">
        <p className="section-eyebrow mb-3">My account</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy">Welcome{user.firstName ? `, ${user.firstName}` : " to ATG Consulting"}.</h1>
        <p className="mt-4 text-navy/70">You’re signed in. Ready to find a practical way AI can save you time?</p>
        <section className="mt-8 rounded-2xl border border-navy/10 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-navy">Your account</h2>
          {error ? <div role="alert" className="mt-4 text-red-700">{error} <button className="underline font-semibold" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div>
            : account?.id === user.id ? <p className="mt-3 text-navy/70">Signed in as <span className="font-semibold break-all text-navy">{account.email || [account.firstName, account.lastName].filter(Boolean).join(" ") || "an ATG Consulting member"}</span></p>
              : <p role="status" className="mt-3 text-navy/60">Verifying your account…</p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={`${basePath}/start`} className="btn-primary">Get my AI plan</a>
            <a href={`${basePath}/#tiers`} className="btn-secondary">Explore services</a>
          </div>
        </section>
      </div>
    </main>
  );
}
