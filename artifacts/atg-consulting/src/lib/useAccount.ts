/**
 * React hook: fetches the logged-in user's account info (including isAdmin).
 * Cached for the session; refetch on userId change.
 */
import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { api } from "./api";
import type { ClientProfile } from "./api";

interface AccountState {
  account: ClientProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAccount(): AccountState {
  const { isLoaded, isSignedIn, user } = useUser();
  const [account, setAccount] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setAccount(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.client.me()
      .then((data) => { if (!cancelled) setAccount(data); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, user?.id, tick]);

  return { account, loading, error, refetch: () => setTick((t) => t + 1) };
}
