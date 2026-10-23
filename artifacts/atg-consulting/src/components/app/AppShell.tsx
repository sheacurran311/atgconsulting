/**
 * Client portal shell: sidebar nav + main content area.
 * Redirects to /sign-in if not authenticated.
 */
import { useUser } from "@clerk/react";
import { Link, useLocation, Redirect } from "wouter";

const navItems = [
  { label: "Dashboard", icon: "⬜", to: "/app" },
  { label: "Consultations", icon: "📅", to: "/app/consultations" },
  { label: "Documents", icon: "📄", to: "/app/documents" },
  { label: "Reports", icon: "📊", to: "/app/reports" },
  { label: "Learn", icon: "🎓", to: "/app/learn" },
  { label: "Account", icon: "⚙️", to: "/app/account" },
];

interface Props { children: React.ReactNode }

export default function AppShell({ children }: Props) {
  const { isLoaded, isSignedIn } = useUser();
  const [location] = useLocation();

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center"><p className="text-navy/50">Loading…</p></div>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;

  return (
    <div className="min-h-screen bg-navy-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-navy text-white flex-shrink-0">
        <div className="p-5 border-b border-white/10">
          <Link to="/">
            <img src="/brand/logos/svg/optionA_lockup_white.svg" alt="ATG Consulting" className="h-7 w-auto" />
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5" aria-label="Client portal navigation">
          {navItems.map((item) => {
            const active = location === item.to || (item.to !== "/app" && location.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to}>
                <span className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/8"}`}>
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link to="/">
            <span className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white text-sm transition-colors">
              ← Back to site
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-navy border-b border-white/10 px-4 py-2 flex gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const active = location === item.to || (item.to !== "/app" && location.startsWith(item.to));
          return (
            <Link key={item.to} to={item.to}>
              <span className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${active ? "bg-white/20 text-white" : "text-white/60"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-0 md:pt-0">
        <div className="p-4 sm:p-8 md:pt-8 mt-16 md:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
