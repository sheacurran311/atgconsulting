import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { api, type AccountIdentity } from "@/lib/api";

// Admin access depends on server identity, not a customer's profile or intake.
export function useIdentity() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [identity, setIdentity] = useState<AccountIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isLoaded) return;
    setIdentity(null); setError("");
    if (!isSignedIn) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    api.account.get().then((value) => { if (active) setIdentity(value); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load your account."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, user?.id, retry]);
  return { identity, loading, error, refetch: () => setRetry((v) => v + 1) };
}
