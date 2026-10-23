import { useEffect } from "react";
import { Route, Switch, Router, useLocation, Redirect } from "wouter";
import { ClerkProvider, useUser } from "@clerk/react";
import { clerkPubKey, clerkProxyUrl, clerkAppearance, basePath, stripBase } from "@/lib/clerk";
import Nav from "@/components/Nav";
import HomePage from "@/pages/home";
import StartPage from "@/pages/start";
import PlanResultPage from "@/pages/plan-result";
import NotFound from "@/pages/not-found";
import { SignInPage, SignUpPage } from "@/pages/auth";

// App (client portal) pages
import DashboardPage from "@/pages/app/dashboard";
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

function Metadata() {
  const [location] = useLocation();
  useEffect(() => {
    const intake = location.replace(/\/$/, "") === "/start";
    const isResult = location.startsWith("/start/result");
    const isApp = location.startsWith("/app");
    const isAdmin = location.startsWith("/admin");
    const title =
      isResult ? "Your AI snapshot | ATG Consulting"
      : intake ? "Get my free snapshot | ATG Consulting"
      : isApp ? "Client portal | ATG Consulting"
      : isAdmin ? "Admin | ATG Consulting"
      : "ATG Consulting | Tailored AI solutions for your business";
    const description = intake || isResult
      ? "A personalised AI readiness snapshot for your role and business. Based in Castle Rock, CO."
      : "Shea designs and delivers AI systems tailored to your specific role, clients, and daily life. Based in Castle Rock, CO.";
    document.title = title;
    for (const [attribute, key, content] of [
      ["name", "description", description],
      ["name", "robots", (intake || isResult || isApp || isAdmin) ? "noindex, nofollow" : "index, follow"],
      ["property", "og:title", title],
      ["property", "og:description", description],
    ] as [string, string, string][]) {
      let element = document.querySelector(`meta[${attribute}="${key}"]`);
      if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, key); document.head.appendChild(element); }
      element.setAttribute("content", content);
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
      {/* Nav is hidden inside /app and /admin (their shells provide navigation) */}
      <Switch>
        <Route path="/app/*?" component={() => null} />
        <Route path="/admin/*?" component={() => null} />
        <Route component={() => <Nav />} />
      </Switch>

      <Switch>
        {/* Marketing */}
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />

        {/* Intake + plan */}
        <Route path="/start" component={StartPage} />
        <Route path="/start/result/:intakeId" component={PlanResultPage} />

        {/* Client portal */}
        <Route path="/app" component={DashboardPage} />
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
