/**
 * Admin portal shell. Redirects non-admins to /app.
 */
import { Link, useLocation, Redirect } from "wouter";
import { useAccount } from "@/lib/useAccount";

const navItems = [
  { label: "Clients", to: "/admin/clients" },
  { label: "Intakes", to: "/admin/intakes" },
  { label: "Reports", to: "/admin/reports" },
  { label: "Content", to: "/admin/content" },
  { label: "Audit log", to: "/admin/audit" },
];

interface Props { children: React.ReactNode }

export default function AdminShell({ children }: Props) {
  const { account, loading } = useAccount();
  const [location] = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-navy/50">Loading…</p></div>;
  if (!account) return <Redirect to="/sign-in" />;
  if (!account.isAdmin) return <Redirect to="/app" />;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:flex flex-col w-56 bg-navy-800 bg-navy text-white flex-shrink-0">
        <div className="p-5 border-b border-white/10">
          <Link to="/">
            <img src="/brand/logos/svg/optionA_lockup_white.svg" alt="ATG Consulting" className="h-7 w-auto mb-1" />
          </Link>
          <span className="text-orange text-xs font-bold tracking-widest uppercase">Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5" aria-label="Admin navigation">
          {navItems.map((item) => {
            const active = location.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}>
                <span className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/8"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link to="/app"><span className="flex px-3 py-2 text-white/50 hover:text-white text-sm rounded-lg">← Client view</span></Link>
        </div>
      </aside>

      {/* Mobile tabs */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-navy px-4 py-2 flex gap-2 overflow-x-auto border-b border-white/10">
        {navItems.map((item) => (
          <Link key={item.to} to={item.to}>
            <span className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${location.startsWith(item.to) ? "bg-white/20 text-white" : "text-white/60"}`}>{item.label}</span>
          </Link>
        ))}
      </div>

      <main className="flex-1 min-w-0">
        <div className="p-4 sm:p-8 mt-16 md:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
