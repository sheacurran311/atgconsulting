import { useEffect, useState } from "react";
import { Route, Switch, Router, useLocation, Redirect } from "wouter";
import { ClerkProvider, useUser } from "@clerk/react";
import { clerkPubKey, clerkProxyUrl, clerkAppearance, basePath, stripBase } from "@/lib/clerk";
import Nav from "@/components/Nav";
import CommandPalette from "@/components/CommandPalette";
import HomePage from "@/pages/home";
import StartPage from "@/pages/start";
import PlanResultPage from "@/pages/plan-result";
import NotFound from "@/pages/not-found";
import { PrivacyPage, TermsPage } from "@/pages/legal";
import { SignInPage, SignUpPage } from "@/pages/auth";

// App (client portal) pages
import DashboardPage from "@/pages/app/dashboard";
import PlanPage from "@/pages/app/plan";
import ConsultationsPage from "@/pages/app/consultations";
import DocumentsPage from "@/pages/app/documents";
import ReportsPage from "@/pages/app/reports";
import LearnPage from "@/pages/app/learn";
import AppAccountPage from "@/pages/app/account";

// Admin pages
import AdminClientsPage from "@/pages/admin/clients";
import AdminIntakesPage from "@/pages/admin/intakes";
import AdminReportsPage from "@/pages/admin/reports";
import AdminContentPage from "@/pages/admin/content";
import AdminAuditPage from "@/pages/admin/audit";
import AdminMessagesPage from "@/pages/admin/messages";
import AdminTiersPage from "@/pages/admin/tiers";

function Metadata() {
  const [location] = useLocation();
  useEffect(() => {
    const intake = location.replace(/\/$/, "") === "/start";
    const isResult = location.startsWith("/start/result");
    const isApp = location.startsWith("/app");
    const isAdmin = location.startsWith("/admin");
    const title =
      isResult ? "Your AI snapshot | ATG Consulting"
      : intake ? "Map my workflow | ATG Consulting"
      : isApp ? "Client portal | ATG Consulting"
      : isAdmin ? "Admin | ATG Consulting"
      : "ATG Consulting | We build the AI workflows. You get the hours back.";
    const desc = intake || isResult
      ? "A personalised AI readiness snapshot for your role and business. Based in Colorado, USA."
      : "Shea designs and delivers AI systems tailored to your specific role, clients, and daily life. Based in Colorado, USA.";
    document.title = title;
    for (const [attr, key, content] of [
      ["name", "description", desc],
      ["name", "robots", (intake || isResult || isApp || isAdmin) ? "noindex, nofollow" : "index, follow"],
      ["property", "og:title", title],
      ["property", "og:description", desc],
    ] as [string, string, string][]) {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute("content", content);
    }
  }, [location]);
  return null;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useUser();
  if (isLoaded && isSignedIn && !window.location.hash) return <Redirect to="/app" />;
  return <HomePage />;
}

function AuthenticatedApp() {
  const [, setLocation] = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [location] = useLocation();

  const isShell = location.startsWith("/app") || location.startsWith("/admin");

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/app`}
      signUpFallbackRedirectUrl={`${basePath}/app`}
      localization={{ signIn: { start: { title: "Welcome back", subtitle: "Sign in to your ATG Consulting account" } }, signUp: { start: { title: "Create your account", subtitle: "Get started with ATG Consulting" } } }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Metadata />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Nav is hidden inside /app and /admin (their shells provide navigation) */}
      {!isShell && <Nav onPalette={() => setPaletteOpen(true)} />}

      <Switch>
        {/* Marketing */}
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />

        {/* Intake + plan */}
        <Route path="/start" component={StartPage} />
        <Route path="/start/result/:intakeId" component={PlanResultPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />

        {/* Client portal */}
        <Route path="/app" component={DashboardPage} />
        <Route path="/app/plan" component={PlanPage} />
        <Route path="/app/consultations/:id" component={ConsultationsPage} />
        <Route path="/app/consultations" component={ConsultationsPage} />
        <Route path="/app/documents" component={DocumentsPage} />
        <Route path="/app/reports/:date" component={ReportsPage} />
        <Route path="/app/reports" component={ReportsPage} />
        <Route path="/app/learn/:slug" component={LearnPage} />
        <Route path="/app/learn" component={LearnPage} />
        <Route path="/app/account" component={AppAccountPage} />

        {/* Admin */}
        <Route path="/admin" component={() => <Redirect to="/admin/clients" />} />
        <Route path="/admin/clients/:id/:tab?" component={AdminClientsPage} />
        <Route path="/admin/clients" component={AdminClientsPage} />
        <Route path="/admin/intakes" component={AdminIntakesPage} />
        <Route path="/admin/reports" component={AdminReportsPage} />
        <Route path="/admin/content" component={AdminContentPage} />
        <Route path="/admin/audit" component={AdminAuditPage} />
        <Route path="/admin/messages" component={AdminMessagesPage} />
        <Route path="/admin/tiers" component={AdminTiersPage} />

        {/* Legacy */}
        <Route path="/user-portal" component={() => <Redirect to="/app" />} />

        <Route component={NotFound} />
      </Switch>
    </ClerkProvider>
  );
}

export default function App() {
  return <Router base={basePath}><AuthenticatedApp /></Router>;
}
