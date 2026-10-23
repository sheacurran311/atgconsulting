import { useEffect } from "react";
import { Route, Switch, Router, useLocation, Redirect } from "wouter";
import { ClerkProvider, useUser } from "@clerk/react";
import { clerkPubKey, clerkProxyUrl, clerkAppearance, basePath, stripBase } from "@/lib/clerk";
import Nav from "@/components/Nav";
import HomePage from "@/pages/home";
import StartPage from "@/pages/start";
import NotFound from "@/pages/not-found";
import { SignInPage, SignUpPage } from "@/pages/auth";
import AccountPage from "@/pages/account";

function Metadata() {
  const [location] = useLocation();
  useEffect(() => {
    const intake = location.replace(/\/$/, "") === "/start";
    const title = intake
      ? "Get my free plan | ATG Consulting"
      : "ATG Consulting | AI Sales Workflows for Small Businesses and Independent Reps";
    const description = intake
      ? "Answer a few quick questions and get a personalised AI workflow plan for your role and industry. Free, no signup required."
      : "Let AI handle the busywork in your sales process: prospecting, research, outreach drafts, follow-ups, and CRM upkeep. Self-serve, guided, or done for you. Based in Castle Rock, CO.";
    const authTitle = location.startsWith("/sign-in") ? "Sign in"
      : location.startsWith("/sign-up") ? "Create an account"
      : location === "/user-portal" ? "My account" : "";
    document.title = authTitle ? `${authTitle} | ATG Consulting` : title;
    for (const [attribute, key, content] of [
      ["name", "description", description],
      ["name", "robots", intake || authTitle ? "noindex, nofollow" : "index, follow"],
      ["property", "og:title", title],
      ["property", "og:description", description],
      ["name", "twitter:title", title],
      ["name", "twitter:description", description],
    ]) {
      let element = document.querySelector(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    }
  }, [location]);
  return null;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useUser();
  if (isLoaded && isSignedIn && !window.location.hash) return <Redirect to="/user-portal" />;
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
      signInFallbackRedirectUrl={`${basePath}/user-portal`}
      signUpFallbackRedirectUrl={`${basePath}/user-portal`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your ATG Consulting account" } },
        signUp: { start: { title: "Create your account", subtitle: "Get started with ATG Consulting" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Metadata />
      <Nav />
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/user-portal" component={AccountPage} />
        <Route path="/start" component={StartPage} />
        <Route path="/start/" component={StartPage} />
        <Route component={NotFound} />
      </Switch>
    </ClerkProvider>
  );
}

export default function App() {
  return <Router base={basePath}><AuthenticatedApp /></Router>;
}
