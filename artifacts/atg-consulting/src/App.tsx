import { TransformationPage } from "@/pages/transformation";
import { marketingPage } from "../../api-server/src/lib/transformationMarketing";
import { industrySites, industryBody } from "@/content/industrySites";
import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Switch, Router, useLocation, Redirect } from "wouter";
import { ClerkProvider, useUser } from "@clerk/react";
import { clerkPubKey, clerkProxyUrl, clerkAppearance, basePath, stripBase } from "@/lib/clerk";
import AccountLanding from "@/components/AccountLanding";
import IntakeEntry from "@/components/IntakeEntry";
import Nav from "@/components/Nav";
import CommandPalette from "@/components/CommandPalette";
import HomePage from "@/pages/home";
import NotFound from "@/pages/not-found";
import { PrivacyPage, TermsPage } from "@/pages/legal";
import RefundsPage from "@/pages/refunds";
import IntakeDiscoveryPage from "@/pages/intake";
import { SignInPage, SignUpPage } from "@/pages/auth";

import BlogPage from "@/pages/blog";
import BlogPostPage from "@/pages/blog-post";

const DeliveryPlaybookPage = lazy(() => import("@/pages/admin/playbook"));
const AdminAccountPage = lazy(() => import("@/pages/admin/account"));
const DashboardPage = lazy(() => import("@/pages/app/dashboard"));
const PlanPage = lazy(() => import("@/pages/app/plan"));
const SessionsPage = lazy(() => import("@/pages/app/sessions"));
const ConsultationsPage = lazy(() => import("@/pages/app/consultations"));
const DocumentsPage = lazy(() => import("@/pages/app/documents"));
const ReportsPage = lazy(() => import("@/pages/app/reports"));
const LearnPage = lazy(() => import("@/pages/app/learn"));
const AppAccountPage = lazy(() => import("@/pages/app/account"));
const ProposalPage = lazy(() => import("@/pages/app/proposal"));
const AdminClientsPage = lazy(() => import("@/pages/admin/clients"));
const AdminReportsPage = lazy(() => import("@/pages/admin/reports"));
const AdminContentPage = lazy(() => import("@/pages/admin/content"));
const AdminAuditPage = lazy(() => import("@/pages/admin/audit"));
const AdminMessagesPage = lazy(() => import("@/pages/admin/messages"));
const AdminTiersPage = lazy(() => import("@/pages/admin/tiers"));
const AdminWorkflowTemplatesPage = lazy(() => import("@/pages/admin/workflow-templates"));
const AdminToolsPage = lazy(() => import("@/pages/admin/tools"));
const AdminAIUsagePage = lazy(() => import("@/pages/admin/ai-usage"));
const AdminDiscoveryPage = lazy(() => import("@/pages/admin/discovery"));
const AdminEngagementsPage = lazy(() => import("@/pages/admin/engagements"));
const AdminCatalogPage = lazy(() => import("@/pages/admin/catalog"));
const AdminTodayPage = lazy(() => import("@/pages/admin/today"));
const AdminProspectingPage = lazy(() => import("@/pages/admin/prospecting"));
const AdminWorkshopPage = lazy(() => import("@/pages/admin/workshop"));
const AutomationLibraryPage = lazy(() => import("@/pages/app/automations"));
const AdminAutomationLibraryPage = lazy(() => import("@/pages/app/automations").then(module => ({default: module.AdminAutomationLibraryPage})));
const WorkshopHomePage = lazy(() => import("@/pages/app/workshop").then(module => ({default: module.WorkshopHomePage})));
const WorkshopLessonPage = lazy(() => import("@/pages/app/workshop").then(module => ({default: module.WorkshopLessonPage})));

function Metadata() {
  const [location] = useLocation();
  useEffect(() => {
    const intake = /^\/intake(?:\/|$)/.test(location);
    const marketing = marketingPage(location);
    const industry = industrySites.find(site=>location.replace(/\/$/,"") === "/website-design/"+site.slug);
    const isResult = false;
    const isApp = location.startsWith("/app");
    const isAdmin = location.startsWith("/admin");
    const title =
      marketing ? marketing.title + " | ATG Consulting"
      : industry ? "Website Design for "+industry.audience+" | ATG Consulting"
      : isResult ? "Your AI snapshot | ATG Consulting"
      : intake ? "Map my workflow | ATG Consulting"
      : isApp ? "Client portal | ATG Consulting"
      : isAdmin ? "Admin | ATG Consulting"
      : "ATG Consulting | AI transformation for small businesses";
    const desc = marketing ? marketing.description : industry ? industry.description : intake || isResult
      ? "An AI assessment for your business, personal and family logistics, or both. No account required."
      : "ATG helps small businesses assess, implement and improve AI workflows, websites and internal systems. Engagements are scoped around business outcomes and reviewed evidence.";
    document.title = title;
    if (marketing || industry) {
      const canonical = new URL((marketing?.path ?? "/website-design/" + industry?.slug), window.location.origin).href;
      document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonical);
      document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonical);
    }
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
      signInFallbackRedirectUrl={`${basePath}/auth/continue`}
      signInForceRedirectUrl={`${basePath}/auth/continue`}
      signUpFallbackRedirectUrl={`${basePath}/auth/continue`}
      signUpForceRedirectUrl={`${basePath}/auth/continue`}
      localization={{ signIn: { start: { title: "Welcome back", subtitle: "Sign in to your ATG Consulting account" } }, signUp: { start: { title: "Create your account", subtitle: "Get started with ATG Consulting" } } }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Metadata />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Nav is hidden inside /app and /admin (their shells provide navigation) */}
      {!isShell && <Nav onPalette={() => setPaletteOpen(true)} />}

      <Suspense fallback={<p role="status" className="px-6 py-4">Loading workspace…</p>}>
      <Switch>
        {/* Marketing */}
        <Route path="/" component={HomeRedirect} />
        <Route path="/auth/continue" component={AccountLanding} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />

        {/* Intake + plan */}
        <Route path="/intake">{() => <IntakeEntry><IntakeDiscoveryPage /></IntakeEntry>}</Route>
        <Route path="/intake/i/:token" component={IntakeDiscoveryPage} />
        <Route path="/intake/e/:token" component={IntakeDiscoveryPage} />
        {/* /start and /start/result/* redirect to /intake */}
        <Route path="/start">
          {() => {
            const search = typeof window !== "undefined" ? window.location.search : "";
            return <Redirect to={"/intake" + search} />;
          }}
        </Route>
        <Route path="/start/result/:id">
          {() => <Redirect to="/intake" />}
        </Route>
        {/* /start/result/* — legacy plan result removed; redirect to discovery inbox */}
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/refunds" component={RefundsPage} />

        {/* Client portal */}
        <Route path="/app" component={DashboardPage} />
        <Route path="/app/plan" component={PlanPage} />
        <Route path="/app/automations" component={AutomationLibraryPage} />
        <Route path="/app/sessions" component={SessionsPage} />
        <Route path="/app/consultations/:id" component={ConsultationsPage} />
        <Route path="/app/consultations" component={ConsultationsPage} />
        <Route path="/app/documents" component={DocumentsPage} />
        <Route path="/app/reports/:date" component={ReportsPage} />
        <Route path="/app/reports" component={ReportsPage} />
        <Route path="/app/learn/workshop/:slug" component={WorkshopLessonPage} />
        <Route path="/app/learn/workshop" component={WorkshopHomePage} />
        <Route path="/app/learn/:slug" component={LearnPage} />
        <Route path="/app/learn" component={LearnPage} />
        <Route path="/app/account" component={AppAccountPage} />
        <Route path="/app/proposal" component={ProposalPage} />

        {/* Admin */}
        <Route path="/admin" component={() => <Redirect to="/admin/today" />} />
        <Route path="/admin/clients/:id/:tab?" component={AdminClientsPage} />
        <Route path="/admin/clients" component={AdminClientsPage} />
        <Route path="/admin/prospecting" component={AdminProspectingPage} />
        <Route path="/admin/reports" component={AdminReportsPage} />
        <Route path="/admin/content" component={AdminContentPage} />
        <Route path="/admin/workshop" component={AdminWorkshopPage} />
        <Route path="/admin/audit" component={AdminAuditPage} />
        <Route path="/admin/messages" component={AdminMessagesPage} />
        <Route path="/admin/tiers" component={AdminTiersPage} />
        <Route path="/admin/workflow-templates" component={AdminWorkflowTemplatesPage} />
        <Route path="/admin/tools" component={AdminToolsPage} />
        <Route path="/admin/ai-usage" component={AdminAIUsagePage} />
        <Route path="/admin/discovery" component={AdminDiscoveryPage} />
        <Route path="/admin/engagements" component={AdminEngagementsPage} />
        <Route path="/admin/catalog" component={AdminCatalogPage} />
        <Route path="/admin/automations" component={AdminAutomationLibraryPage} />
        <Route path="/admin/playbook" component={DeliveryPlaybookPage} />
        <Route path="/admin/account" component={AdminAccountPage} />
        <Route path="/admin/today" component={AdminTodayPage} />
        <Route path="/services">{() => <TransformationPage path="/services" />}</Route>
        <Route path="/services/:slug">{params => {
          const path = "/services/" + params.slug;
          return marketingPage(path) ? <TransformationPage path={path} /> : <NotFound />;
        }}</Route>
        <Route path="/seo-aeo">{() => <TransformationPage path="/seo-aeo" />}</Route>
        <Route path="/seo-aeo/:slug">{params => {
          const path = "/seo-aeo/" + params.slug;
          return marketingPage(path) ? <TransformationPage path={path} /> : <NotFound />;
        }}</Route>
        <Route path="/value-realization">{() => <TransformationPage path="/value-realization" />}</Route>
        <Route path="/website-design/:slug">{params=>{
          const site=industrySites.find(row=>row.slug===params.slug);
          return site ? <div dangerouslySetInnerHTML={{__html:industryBody(site)}} /> : <NotFound />;
        }}</Route>
        <Route path="/blog" component={BlogPage} />
        <Route path="/blog/:slug" component={BlogPostPage} />

        {/* Legacy */}
        <Route path="/user-portal" component={() => <Redirect to="/app" />} />

        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </ClerkProvider>
  );
}

export default function App() {
  return <Router base={basePath}><AuthenticatedApp /></Router>;
}
