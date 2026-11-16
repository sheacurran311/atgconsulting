import { useEffect, useRef } from "react";

export async function adminJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error ?? `Request failed (${response.status}). Please try again.`);
  if (payload === null) throw new Error("The server returned an unreadable response. Refresh to check the saved result before retrying.");
  return payload as T;
}
export function announceAdminChange() {
  window.dispatchEvent(new Event("atg:admin-work-changed"));
  if (typeof BroadcastChannel !== "undefined") { const channel = new BroadcastChannel("atg-admin-work"); channel.postMessage("changed"); channel.close(); }
}
/** Refresh visible work after tab switches, changes in another tab, or 30 seconds. */
export function useAdminRefresh(refresh: () => void) {
  const callback = useRef(refresh); callback.current = refresh;
  useEffect(() => {
    const run = () => { if (!document.hidden) callback.current(); };
    window.addEventListener("focus", run); window.addEventListener("atg:admin-work-changed", run);
    document.addEventListener("visibilitychange", run);
    const timer = window.setInterval(run, 30_000);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("atg-admin-work") : null;
    if (channel) channel.onmessage = run;
    return () => { window.clearInterval(timer); channel?.close(); window.removeEventListener("focus", run); window.removeEventListener("atg:admin-work-changed", run); document.removeEventListener("visibilitychange", run); };
  }, []);
}
