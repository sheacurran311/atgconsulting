import { useState } from "react";
import { Link, useLocation, Redirect } from "wouter";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Contact,
  ChevronDown,
  Layers,
  MessageSquare,
  ScrollText,
  Search,
  Sparkles,
  Users,
  UserRound,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useIdentity } from "@/lib/useIdentity";
import LogoLockup from "@/components/LogoLockup";
import AdminSignOut from "@/components/admin/AdminSignOut";
import AdminSwitcher from "@/components/admin/AdminSwitcher";

type NavItem = { label: string; to: string; icon: LucideIcon };
type NavGroup = { title: string; description: string; items: NavItem[] };

/** All existing destinations retained, grouped by the work the operator is doing. */
const navGroups: NavGroup[] = [
  { title: "Overview", description: "Priorities", items: [
    { label: "Today", to: "/admin/today", icon: Sparkles },
  ] },
  { title: "Growth & Prospecting", description: "Acquire and qualify clients", items: [
    { label: "Prospecting", to: "/admin/prospecting", icon: Search },
    { label: "Intakes", to: "/admin/discovery", icon: ClipboardList },
    { label: "Content", to: "/admin/content", icon: BookOpen },
  ] },
  { title: "Clients & Delivery", description: "Manage engagements", items: [
    { label: "Clients", to: "/admin/clients", icon: Contact },
    { label: "Engagements", to: "/admin/engagements", icon: Users },
    { label: "Plans & DFY", to: "/admin/tiers", icon: Layers },
    { label: "Messages", to: "/admin/messages", icon: MessageSquare },
    { label: "Reports", to: "/admin/reports", icon: BarChart3 },
  ] },
  { title: "Playbooks & Resources", description: "Reusable methods and tools", items: [
    { label: "Delivery playbook", to: "/admin/playbook", icon: BookOpen },
    { label: "Automation bots", to: "/admin/automations", icon: Workflow },
    { label: "Templates", to: "/admin/workflow-templates", icon: Workflow },
    { label: "Catalog", to: "/admin/catalog", icon: Search },
    { label: "Tools", to: "/admin/tools", icon: Wrench },
    { label: "Workshop", to: "/admin/workshop", icon: BookOpen },
  ] },
  { title: "System & Settings", description: "Administration", items: [
    { label: "AI usage", to: "/admin/ai-usage", icon: Sparkles },
    { label: "Audit log", to: "/admin/audit", icon: ScrollText },
    { label: "Account", to: "/admin/account", icon: UserRound },
  ] },
];
const navItems = navGroups.flatMap((group) => group.items);

const MOBILE_PRIMARY = new Set(["/admin/today", "/admin/discovery", "/admin/clients"]);

interface Props { children: React.ReactNode }

export default function AdminShell({ children }: Props) {
  const { identity: account, loading, error, refetch } = useIdentity();
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
  if (error) return <main className="p-8"><p role="alert" className="mb-4">{error}</p><button className="btn-primary" onClick={refetch}>Try again</button></main>;
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

        <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 mt-1" aria-label="Admin navigation">
          {navGroups.map((group) => {
            const groupActive = group.items.some((item) => location.startsWith(item.to));
            return (
              <details key={group.title} open={group.title === "Overview" || groupActive}
                className="rounded-md border" style={{ borderColor: groupActive ? "var(--ink-border)" : "transparent" }}>
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-xs font-semibold"
                  style={{ color: groupActive ? "#FFFFFF" : "#C7C7CF", background: groupActive ? "var(--ink-2)" : "transparent" }}>
                  <span>{group.title}</span>
                  <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                </summary>
                <div className="space-y-0.5 pb-1 pl-2">
                  {group.items.map((item) => {
                    const active = location.startsWith(item.to);
                    return (
                      <Link key={item.to} to={item.to}>
                        <span className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                          aria-current={active ? "page" : undefined}
                          style={{ color: "#FFFFFF", background: active ? "var(--ink-2)" : "transparent" }}>
                          <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" strokeWidth={1.75}
                            style={{ color: active ? "var(--blue)" : "#FFFFFF" }} />
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </nav>

        <div className="p-2" style={{ borderTop: "1px solid var(--ink-border)" }}>
          <AdminSwitcher variant="sidebar" />
          <div className="px-3 py-2 text-white space-y-2"><p className="text-xs break-all">{account.email}</p><AdminSignOut className="text-xs font-semibold underline text-white" /></div>
        </div>
      </aside>

      {/* Mobile top tabs — Today, Intakes, Clients, and the rest under More */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40"
        style={{ background: "var(--ink)", borderBottom: "1px solid var(--ink-border)" }}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0 px-1 py-1.5 flex items-center">
            <AdminSwitcher variant="compact" />
          </div>
          {mobilePrimary.map((item) => (
            <Link key={item.to} to={item.to}>
              <span
                className="flex items-center gap-1.5 flex-shrink-0 px-2 py-2.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
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
            className="flex items-center gap-1.5 flex-shrink-0 px-2 py-2.5 text-xs font-semibold whitespace-nowrap"
            style={{ color: moreActive || moreOpen ? "var(--blue)" : "#FFFFFF", background: "transparent", border: 0 }}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            More
          </button>
        </div>
        {moreOpen && (
          <div className="max-h-[70vh] overflow-y-auto px-3 pb-3" style={{ borderTop: "1px solid var(--ink-border)" }}>
            {navGroups.map((group) => {
              const items=group.items.filter(item=>!MOBILE_PRIMARY.has(item.to));
              if(!items.length) return null;
              return <div key={group.title} className="pt-3">
                <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wide" style={{ color: "#BFC2CA" }}>{group.title}</p>
                <div className="grid grid-cols-2 gap-1">
                  {items.map((item) => (
                    <Link key={item.to} to={item.to}>
                      <span className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs font-semibold"
                        aria-current={location.startsWith(item.to) ? "page" : undefined}
                        style={{ color: location.startsWith(item.to) ? "var(--blue)" : "#FFFFFF", background: location.startsWith(item.to) ? "var(--ink-2)" : "transparent" }}
                        onClick={() => setMoreOpen(false)}>
                        <item.icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" strokeWidth={1.75} />
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>;
            })}
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
