import { useEffect } from "react";
import { Route, Switch, Router, useLocation } from "wouter";
import Nav from "@/components/Nav";
import HomePage from "@/pages/home";
import StartPage from "@/pages/start";
import NotFound from "@/pages/not-found";

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
    document.title = title;
    for (const [attribute, key, content] of [
      ["name", "description", description],
      ["name", "robots", intake ? "noindex, nofollow" : "index, follow"],
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

export default function App() {
  return (
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Metadata />
      <Nav />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/start" component={StartPage} />
        <Route path="/start/" component={StartPage} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}
