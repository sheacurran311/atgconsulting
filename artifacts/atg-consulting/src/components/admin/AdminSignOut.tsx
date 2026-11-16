import { useState } from "react";
import { useClerk } from "@clerk/react";
import { basePath } from "@/lib/clerk";
import { clearClientView } from "@/lib/viewMode";

export default function AdminSignOut({ className = "btn-secondary text-sm" }: { className?: string }) {
  const { signOut } = useClerk();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function exit() {
    setBusy(true); setError(""); clearClientView();
    try {
      // Signing out must remain possible when the API is unavailable.
      await fetch("/api/admin/impersonate", { method: "DELETE", credentials: "include" }).catch(() => null);
      await signOut({ redirectUrl: basePath || "/" });
    } catch { setError("Could not sign out. Please try again."); setBusy(false); }
  }
  return <div><button type="button" onClick={exit} disabled={busy} className={className}>{busy ? "Signing out…" : "Sign out"}</button>{error && <p role="alert" className="text-xs mt-2">{error}</p>}</div>;
}
