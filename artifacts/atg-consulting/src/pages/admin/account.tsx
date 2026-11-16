import AdminShell from "@/components/admin/AdminShell";
import AdminSignOut from "@/components/admin/AdminSignOut";
import { useIdentity } from "@/lib/useIdentity";

export default function AdminAccountPage() {
  const { identity: account } = useIdentity();
  return <AdminShell><div className="max-w-xl space-y-6">
    <div><p className="section-eyebrow">ADMIN CONSOLE</p><h1 className="text-2xl font-bold">Account</h1></div>
    <div className="rounded-xl border border-canvas-border bg-canvas-1 p-5 space-y-4">
      <div><p className="text-xs font-semibold">Name</p><p>{account?.name || "Administrator"}</p></div>
      <div><p className="text-xs font-semibold">Email</p><p className="break-all">{account?.email}</p></div>
      <div><p className="text-xs font-semibold">Access</p><p>Administrator</p></div>
      <p className="text-sm">This is your admin account. Customer plans and intake forms are managed separately.</p>
      <AdminSignOut />
    </div>
  </div></AdminShell>;
}
