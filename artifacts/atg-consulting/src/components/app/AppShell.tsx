import { useUser } from "@clerk/react";
import { Link, useLocation, Redirect } from "wouter";
import {
  ArrowLeft,
  CalendarCheck,
  FileText,
  GraduationCap,
  ScrollText,
  LayoutDashboard,
  Map,
  MessagesSquare,
  Shield,
  UserRound,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import LogoLockup from "@/components/LogoLockup";
import OperatorPanel from "@/components/workbench/OperatorPanel";
import IntakeGate from "@/components/app/IntakeGate";
import ImpersonationBanner from "@/components/app/ImpersonationBanner";
import { useAccount } from "@/lib/useAccount";
import { hasOperator } from "@/lib/tiers";
import { clearClientView } from "@/lib/viewMode";

const navItems: { label: string; to: string; icon: LucideIcon }[] = [
  { label: "Dashboard",     to: "/app",               icon: LayoutDashboard },
  { label: "Proposal",      to: "/app/proposal",      icon: ScrollText },
  { label: "My plan",       to: "/app/plan",          icon: Map },
  { label: "Sessions",      to: "/app/sessions",      icon: CalendarCheck },
  { label: "Consultations", to: "/app/consultations", icon: MessagesSquare },
  { label: "Documents",     to: "/app/documents",     icon: FileText },
  { label: "Reports",       to: "/app/reports",       icon: BarChart3 },
  { label: "Learn",         to: "/app/learn",         icon: GraduationCap },
  { label: "Account",       to: "/app/account",       icon: UserRound },
];

interface Props { children: React.ReactNode; wide?: boolean; allowWithoutIntake?: boolean }

export default function AppShell({ children, wide = false, allowWithoutIntake = false }: Props) {
  const { isLoaded, isSignedIn } = useUser();
  const { account } = useAccount();
  const [location, setLocation] = useLocation();
  const operator = hasOperator(account?.tier);

  function openAdmin() {
    clearClientView();
    setLocation("/admin");
  }

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
    <IntakeGate allowWithoutIntake={allowWithoutIntake}>
    <ImpersonationBanner />
    <div className="min-h-screen flex" style={{ background: "var(--canvas)" }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-52 flex-shrink-0 h-dvh sticky top-0"
        style={{
          background: "var(--ink-1)",
          borderRight: "1px solid var(--ink-border)",
        }}
      >
        {/* Logo */}
        <div className="p-4 pb-3" style={{ borderBottom: "1px solid var(--ink-border)" }}>
          <Link to="/">
            <LogoLockup variant="dark" height={28} aria-label="ATG Consulting — home" />
          </Link>
          <span className="font-mono text-2xs mt-2 block" style={{ color: "var(--ink-text-3)", letterSpacing: "0.1em" }}>
            CLIENT PORTAL
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5 mt-1" aria-label="Client portal navigation">
          {navItems.map((item) => {
            const active = location === item.to || (item.to !== "/app" && location.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to}>
                <span
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    color: "#FFFFFF",
                    background: active ? "var(--ink-2)" : "transparent",
                    letterSpacing: "-0.005em",
                  }}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" strokeWidth={1.75} style={{ color: active ? "var(--blue)" : "#FFFFFF" }} />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-shrink-0 p-3" style={{ borderTop: "1px solid var(--ink-border)" }}>
          {account?.isAdmin && (
            <button
              type="button"
              onClick={openAdmin}
              className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold cursor-pointer"
              style={{ color: "#FFFFFF", background: "transparent", border: "none", textAlign: "left" }}
            >
              <Shield className="w-4 h-4 flex-shrink-0" aria-hidden="true" strokeWidth={1.75} />
              Admin console
            </button>
          )}
          {account ? (operator ? <OperatorPanel /> : <OperatorUpgrade />) : null}
          <Link to="/">
            <span className="flex items-center gap-2 px-3 py-2 mt-2 rounded-md text-xs font-medium transition-colors cursor-pointer" style={{ color: "#FFFFFF" }}>
              <ArrowLeft className="w-4 h-4 flex-shrink-0" aria-hidden="true" strokeWidth={1.75} />
              Marketing site
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile tab bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: "var(--ink-1)",
          borderTop: "1px solid var(--ink-border)",
          paddingBottom: "env(safe-area-inset-bottom)",
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        {navItems.map((item) => {
          const active = location === item.to || (item.to !== "/app" && location.startsWith(item.to));
          return (
            <Link key={item.to} to={item.to}>
              <span
                className="flex flex-col items-center gap-0.5 px-4 py-3 text-2xs font-medium whitespace-nowrap flex-shrink-0 cursor-pointer"
                style={{ color: "#FFFFFF" }}
              >
                <item.icon className="w-4 h-4" aria-hidden="true" strokeWidth={1.75} style={{ color: active ? "var(--blue)" : "#FFFFFF" }} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto pb-20 md:pb-0">
        {account?.isAdmin && (
          <div
            className="flex items-center justify-between gap-3 px-5 sm:px-8 py-2"
            style={{ background: "var(--ink-1)", borderBottom: "1px solid var(--ink-border)" }}
          >
            <span className="text-xs font-medium" style={{ color: "var(--ink-text-2)" }}>
              Signed in as admin. This is the client portal.
            </span>
            <button
              type="button"
              onClick={openAdmin}
              className="text-xs font-semibold flex-shrink-0 cursor-pointer"
              style={{ color: "var(--blue)", background: "transparent", border: "none" }}
            >
              Open admin console
            </button>
          </div>
        )}
        <div className={wide ? "p-5 sm:p-8" : "p-5 sm:p-8 max-w-content mx-auto"}>
          {children}
        </div>
        {/* Legal footer links */}
        <div className="hidden md:flex gap-4 px-6 pb-5 mt-2" style={{ borderTop: "1px solid var(--canvas-border)", paddingTop: "12px" }}>
          {[["Terms", "/terms"], ["Privacy", "/privacy"], ["Refunds", "/refunds"]].map(([label, to]) => (
            <Link key={to} to={to!}>
              <span className="text-xs hover:underline" style={{ color: "var(--canvas-text-3)" }}>{label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
    </IntakeGate>
  );
}

function OperatorUpgrade() {
  return (
    <div className="rounded-xl p-3" style={{ border: "1px solid var(--ink-border)", background: "var(--ink-2)" }}>
      <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>SHEA</p>
      <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--ink-text-3)" }}>
        Want Shea to set this up for you?
      </p>
      <Link to="/app/consultations" className="text-xs font-semibold underline" style={{ color: "var(--blue)" }}>
        See consultations
      </Link>
    </div>
  );
}
