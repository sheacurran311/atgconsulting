import { useUser } from "@clerk/react";
import { Link, useLocation, Redirect } from "wouter";

const navItems = [
  { label: "Dashboard",     to: "/app",                  icon: "◈" },
  { label: "Consultations", to: "/app/consultations",    icon: "◷" },
  { label: "Documents",     to: "/app/documents",        icon: "▤" },
  { label: "Reports",       to: "/app/reports",          icon: "▦" },
  { label: "Learn",         to: "/app/learn",            icon: "◎" },
  { label: "Account",       to: "/app/account",          icon: "◉" },
];

interface Props { children: React.ReactNode }

export default function AppShell({ children }: Props) {
  const { isLoaded, isSignedIn } = useUser();
  const [location] = useLocation();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--canvas)" }}>
        <span className="font-mono text-xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>
          LOADING…
        </span>
      </div>
    );
  }
  if (!isSignedIn) return <Redirect to="/sign-in" />;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--canvas)" }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-52 flex-shrink-0"
        style={{
          background: "var(--ink-1)",
          borderRight: "1px solid var(--ink-border)",
        }}
      >
        {/* Logo */}
        <div className="p-4 pb-3" style={{ borderBottom: "1px solid var(--ink-border)" }}>
          <Link to="/">
            <img
              src="/brand/logos/svg/optionA_lockup_notag.svg"
              alt="ATG Consulting"
              className="h-7 w-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </Link>
          <span className="font-mono text-2xs mt-2 block" style={{ color: "var(--ink-text-3)", letterSpacing: "0.1em" }}>
            CLIENT PORTAL
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 mt-1" aria-label="Client portal navigation">
          {navItems.map((item) => {
            const active = location === item.to || (item.to !== "/app" && location.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to}>
                <span
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    color: active ? "var(--ink-text)" : "var(--ink-text-3)",
                    background: active ? "var(--ink-2)" : "transparent",
                    letterSpacing: "-0.005em",
                  }}
                >
                  <span className="font-mono text-xs" aria-hidden="true" style={{ color: active ? "var(--blue)" : "var(--ink-text-3)" }}>
                    {item.icon}
                  </span>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Back to site */}
        <div className="p-2" style={{ borderTop: "1px solid var(--ink-border)" }}>
          <Link to="/">
            <span
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer"
              style={{ color: "var(--ink-text-3)" }}
            >
              ← Marketing site
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile tab bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto"
        style={{
          background: "var(--ink-1)",
          borderTop: "1px solid var(--ink-border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {navItems.map((item) => {
          const active = location === item.to || (item.to !== "/app" && location.startsWith(item.to));
          return (
            <Link key={item.to} to={item.to}>
              <span
                className="flex flex-col items-center gap-0.5 px-4 py-3 text-2xs font-medium whitespace-nowrap flex-shrink-0 cursor-pointer"
                style={{ color: active ? "var(--blue)" : "var(--ink-text-3)" }}
              >
                <span className="font-mono text-base leading-none">{item.icon}</span>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto pb-20 md:pb-0">
        <div className="p-5 sm:p-8 max-w-content mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
