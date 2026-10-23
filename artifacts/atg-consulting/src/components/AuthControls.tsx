import { useClerk, useUser } from "@clerk/react";
import { basePath } from "@/lib/clerk";

export default function AuthControls({ onNavigate }: { onNavigate?: () => void }) {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  if (!isLoaded) return <span className="text-sm text-navy/60" role="status">Loading account…</span>;
  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <a href={`${basePath}/sign-in`} onClick={onNavigate} className="text-sm font-semibold text-navy hover:underline">Sign in</a>
        <a href={`${basePath}/sign-up`} onClick={onNavigate} className="text-sm font-semibold text-navy hover:underline">Create account</a>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <a href={`${basePath}/user-portal`} onClick={onNavigate} className="text-sm font-semibold text-navy hover:underline">My account</a>
      <button type="button" className="text-sm font-medium text-navy/70 hover:underline" onClick={() => {
        onNavigate?.();
        void signOut({ redirectUrl: basePath || "/" });
      }}>Sign out</button>
    </div>
  );
}
