import { useState } from "react";
import { Link, useLocation, Redirect } from "wouter";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Contact,
  Layers,
  MessageSquare,
  ScrollText,
  Search,
  Sparkles,
  Users,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useAccount } from "@/lib/useAccount";
import LogoLockup from "@/components/LogoLockup";
import AdminSwitcher from "@/components/admin/AdminSwitcher";

const navItems: { label: string; to: string; icon: LucideIcon }[] = [
  { label: "Today",       to: "/admin/today",              icon: Sparkles },
  { label: "Intakes",     to: "/admin/discovery",          icon: ClipboardList },
  { label: "Engagements", to: "/admin/engagements",        icon: Users },
  { label: "Catalog",     to: "/admin/catalog",            icon: Search },
  { label: "Content",     to: "/admin/content",            icon: BookOpen },
  { label: "Clients",     to: "/admin/clients",            icon: Contact },
  { label: "Plans & DFY", to: "/admin/tiers",              icon: Layers },
  { label: "Messages",    to: "/admin/messages",           icon: MessageSquare },
  { label: "Reports",     to: "/admin/reports",            icon: BarChart3 },
  { label: "Templates",   to: "/admin/workflow-templates", icon: Workflow },
  { label: "Tools",       to: "/admin/tools",              icon: Wrench },
  { label: "AI usage",    to: "/admin/ai-usage",           icon: Sparkles },
  { label: "Audit log",   to: "/admin/audit",              icon: ScrollText },
];

const MOBILE_PRIMARY = new Set(["/admin/today", "/admin/discovery", "/admin/clients"]);

interface Props { children: React.ReactNode }

export default function AdminShell({ children }: Props) {
  const { account, loading } = useAccount();
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const mobilePrimary = navItems.filter((item) => MOBILE_PRIMARY.has(item.to));
  const mobileMore = navItems.filter((item) => !MOBILE_PRIMARY.has(item.to));
  const moreActive = mobileMore.some((item) => location.startsWith(item.to));

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
        className="hidden md:flex flex-col w-52 flex-shrink-0 h-dvh sticky top-0"
        style={{ background: "var(--ink)", borderRight: "1px solid var(--ink-border)" }}
      >
        <div className="p-4 pb-3" style={{ borderBottom: "1px solid var(--ink-border)" }}>
          <Link to="/">
            <LogoLockup variant="dark" height={28} aria-label="ATG Consulting — home" />
          </Link>
          <div className="mt-3">
            <span className="font-mono text-2xs block" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
              ADMIN CONSOLE
            </span>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 mt-1" aria-label="Admin navigation">
          {navItems.map((item) => {
            const active = location.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}>
                <span
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    color: "#FFFFFF",
                    background: active ? "var(--ink-2)" : "transparent",
                  }}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" strokeWidth={1.75} style={{ color: active ? "var(--blue)" : "#FFFFFF" }} />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-2" style={{ borderTop: "1px solid var(--ink-border)" }}>
          <AdminSwitcher variant="sidebar" />
        </div>
      </aside>

      {/* Mobile top tabs — Today, Intakes, Clients, and the rest under More */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40"
        style={{ background: "var(--ink)", borderBottom: "1px solid var(--ink-border)" }}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0 px-2 py-1.5 flex items-center">
            <AdminSwitcher variant="compact" />
          </div>
          {mobilePrimary.map((item) => (
            <Link key={item.to} to={item.to}>
              <span
                className="flex items-center gap-1.5 flex-shrink-0 px-3 py-2.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
                style={{ color: "#FFFFFF" }}
                onClick={() => setMoreOpen(false)}
              >
                <item.icon className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.75} style={{ color: location.startsWith(item.to) ? "var(--blue)" : "#FFFFFF" }} />
                {item.label}
              </span>
            </Link>
          ))}
          <button
            type="button"
            className="flex items-center gap-1.5 flex-shrink-0 px-3 py-2.5 text-xs font-semibold whitespace-nowrap"
            style={{ color: moreActive || moreOpen ? "var(--blue)" : "#FFFFFF", background: "transparent", border: 0 }}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            More
          </button>
        </div>
        {moreOpen && (
          <div className="grid grid-cols-2 gap-1 px-2 pb-2" style={{ borderTop: "1px solid var(--ink-border)" }}>
            {mobileMore.map((item) => (
              <Link key={item.to} to={item.to}>
                <span
                  className="flex items-center gap-1.5 px-2 py-2 text-xs font-semibold cursor-pointer"
                  style={{ color: "#FFFFFF" }}
                  onClick={() => setMoreOpen(false)}
                >
                  <item.icon className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.75} style={{ color: location.startsWith(item.to) ? "var(--blue)" : "#FFFFFF" }} />
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        )}
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
