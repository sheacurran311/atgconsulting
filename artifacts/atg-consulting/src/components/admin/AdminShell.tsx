import { Link, useLocation, Redirect } from "wouter";
import { useAccount } from "@/lib/useAccount";
import LogoLockup from "@/components/LogoLockup";

const navItems = [
  { label: "Clients",     to: "/admin/clients"  },
  { label: "Intakes",     to: "/admin/intakes"  },
  { label: "Reports",     to: "/admin/reports"  },
  { label: "Content",     to: "/admin/content"  },
  { label: "Audit log",   to: "/admin/audit"    },
];

interface Props { children: React.ReactNode }

export default function AdminShell({ children }: Props) {
  const { account, loading } = useAccount();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ink)" }}>
        <span className="font-mono text-xs" style={{ color: "var(--ink-text-3)", letterSpacing: "0.08em" }}>
          LOADING ADMIN…
        </span>
      </div>
    );
  }
  if (!account) return <Redirect to="/sign-in" />;
  if (!account.isAdmin) return <Redirect to="/app" />;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--canvas)" }}>

      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-52 flex-shrink-0"
        style={{ background: "var(--ink)", borderRight: "1px solid var(--ink-border)" }}
      >
        <div className="p-4 pb-3" style={{ borderBottom: "1px solid var(--ink-border)" }}>
          <Link to="/">
            <LogoLockup variant="dark" height={28} aria-label="ATG Consulting — home" />
          </Link>
          <span className="font-mono text-2xs mt-2 block" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
            ADMIN CONSOLE
          </span>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 mt-1" aria-label="Admin navigation">
          {navItems.map((item) => {
            const active = location.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}>
                <span
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    color: active ? "var(--ink-text)" : "var(--ink-text-3)",
                    background: active ? "var(--ink-2)" : "transparent",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-2" style={{ borderTop: "1px solid var(--ink-border)" }}>
          <Link to="/app">
            <span className="flex px-3 py-2 text-xs font-medium rounded-md cursor-pointer" style={{ color: "var(--ink-text-3)" }}>
              ← Client view
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile top tabs */}
      <div
        className="md:hidden fixed top-14 left-0 right-0 z-40 flex overflow-x-auto"
        style={{ background: "var(--ink)", borderBottom: "1px solid var(--ink-border)" }}
      >
        {navItems.map((item) => (
          <Link key={item.to} to={item.to}>
            <span
              className="flex-shrink-0 px-4 py-2.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
              style={{ color: location.startsWith(item.to) ? "var(--blue)" : "var(--ink-text-3)" }}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-5 sm:p-8 mt-10 md:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
