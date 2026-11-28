import { industryIntake, industrySites } from "./industrySites";
import { serviceDivisions, transformationServices, transformationStages } from "./transformationServices";

type Page = {
  path: string; title: string; description: string; eyebrow: string; cta: string; intake: string;
  sections: {title: string; text: string}[];
  links: {href: string; label: string}[];
};

const examples: Record<string, [string, string]> = {
  "ai-readiness": ["Start with the systems, processes, data and decision-makers you already have. Identify prerequisites and pick a first project with a testable outcome.", "A readiness baseline, prioritized opportunities, and a roadmap with dependencies and an owner for each next decision."],
  "workflow-engineering": ["Map a recurring process such as lead routing, reporting or document preparation. Design the trigger, expected output and fallback for exceptions.", "Compare time, error rates or turnaround before and after a test run using the same definition and sample."],
  "context-engineering": ["Specify the information, business rules, and instructions an AI workflow needs. Assign owners and decide how approved information is updated.", "Check representative answers against approved sources, access controls and the rules for escalation."],
  "agentic-automation": ["Design a bounded assistant for research, classification or operational handoffs. Define available tools, review gates and escalation before implementation.", "Test permitted actions, predictable failure scenarios, human review and recovery in a scoped environment."],
  "custom-tools": ["Build a focused internal dashboard, intake process or business application around the work your team performs every day.", "Agree role permissions and acceptance criteria, then verify tasks using representative, approved test records."],
  "digital-transformation": ["Combine website and brand updates, customer intake, search visibility and operational follow-through into a scoped modernization project.", "Choose relevant measures such as qualified requests, organic acquisition and completed handoffs. Establish a baseline before rollout."],
  "knowledge-management": ["Organize approved internal documents, SOPs and FAQs so employees can find the right information and see where it came from.", "Review retrieval accuracy against an agreed question set and test what people can retrieve with their assigned access."],
  "ai-governance": ["Define approved use cases, owners, data permissions, review requirements, retention and escalation for the systems that use AI.", "Review implementation against the agreed controls, including what happens when a request exceeds a system’s authority."],
  "ai-training": ["Train staff using role-specific examples and approved workflows. Document where to check outputs, ask for help and hand a task to a human.", "Evaluate practical tasks with an agreed rubric and give process owners material for onboarding and refreshers."],
  "voice-ai": ["Evaluate an inbound voice pilot for routine inquiries and routing. It requires scope, caller disclosures, approved data boundaries and a reliable human fallback.", "Test call routing, transfers, misunderstandings, escalation and sample reviews before considering production use."],
  "performance-monitoring": ["Agree what to monitor, who handles incidents, what support covers and how changes are reviewed.", "Use activity logs, cost records and business measures for periodic reviews. Report evidence gaps and record adjustments."],
  "fractional-ai-leadership": ["Work with a fractional AI lead on roadmap, vendor decisions, governance, adoption and performance at an agreed cadence.", "Set advisory capacity, review dates, decision owners and reporting. Define implementation and support separately in the scope."],
};

export function serviceIntake(id: string) {
  return "/intake?audience=business&service=" + encodeURIComponent(id);
}

export const servicePages: Page[] = transformationServices.map(service => ({
  path: "/services/" + service.id,
  title: service.name.replace(/^./, value => value.toUpperCase()),
  description: examples[service.id]![0],
  eyebrow: serviceDivisions[service.division],
  cta: "Discuss " + service.name,
  intake: serviceIntake(service.id),
  sections: [
    {title: "What we’ll discuss", text: service.prompt},
    {title: "What we’ll agree before starting", text: service.proposal},
    {title: "How we’ll check progress", text: examples[service.id]![1]},
  ],
  links: [{href: "/services", label: "All services"}, {href: "/value-realization", label: "How ATG measures results"}],
}));

export const seoIndustries: Page[] = industrySites.map(site => {
  const subject = site.slug === "orthopedic-surgeons" || site.slug === "doctors" || site.slug === "dentists" ? "appointment requests"
    : site.slug === "real-estate-agents" ? "showing and listing consultation requests"
    : site.slug === "attorneys" ? "consultation requests by practice area" : "calls and qualified service requests";
  const focus = site.slug === "orthopedic-surgeons" ? "Check procedure, specialist and office pages against the way patients describe knee, hip and shoulder concerns."
    : site.structure;
  return {
    path: "/seo-aeo/" + site.slug, eyebrow: "Search and answer engine optimization", title: "SEO and AEO for " + site.audience,
    description: "Help the right people discover " + site.industry.toLowerCase() + " and make it easier to turn interest into " + subject + ".",
    cta: "Discuss search visibility", intake: serviceIntake("digital-transformation") + "&vertical=" + site.slug,
    sections: [
      {title: "What we review", text: focus + " Review crawlability, page structure, local listings, canonical URLs and fit for useful structured data."},
      {title: "How we measure progress", text: "With authorized data, track search clicks and impressions separately from onsite sessions and key events. Use comparable time periods and track " + subject + " only where meaningful measurement is available."},
      {title: "How we evaluate AI search", text: "Record the question, platform, date, location context and any citations for a defined set of queries. Repeated samples can show changes in visibility. Rankings and citations vary."},
      {title: "What we’ll ask", text: site.question},
    ],
    links: [{href: "/website-design/" + site.slug, label: "Website design for " + site.audience}, {href: "/seo-aeo", label: "All SEO and AEO services"}, {href: "/value-realization", label: "How ATG measures results"}],
  };
});

export const marketingPages: Page[] = [
  {
    path: "/services", title: "AI transformation services", eyebrow: "ATG Consulting",
    description: "Choose a focused project or combine strategy, implementation, training and managed improvement in a custom engagement.",
    sections: transformationStages.map((title, index) => ({title, text: [
      "Identify the business problem, available data and decision owner.", "Prioritize opportunities using feasibility, evidence and expected value.",
      "Agree scope and test the solution with an approved delivery plan.", "Document permission boundaries, train owners and verify recovery procedures.",
      "Compare observed results with the baseline and decide what to improve.", ][index]!})),
    cta: "Start the free assessment", intake: "/intake?audience=business",
    links: [...servicePages.map(page => ({href: page.path, label: page.title})), {href: "/seo-aeo", label: "Search and answer engine optimization"}],
  },
  {
    path: "/seo-aeo", title: "SEO and answer engine optimization", eyebrow: "Digital transformation and growth",
    description: "Make service pages easier to find and use. Establish how search visibility and on-site actions can be measured for your business.",
    cta: "Start a search visibility assessment", intake: serviceIntake("digital-transformation"),
    sections: [
      {title: "Technical and content review", text: "Review site access, page structure, local entity information, and whether service pages answer the questions customers are asking."},
      {title: "Separate search and website evidence", text: "Search Console reports activity on Google Search. Analytics reports activity on your site. Each has its own measurement and attribution limits."},
      {title: "Answer engine sampling", text: "Use a documented list of prompts and record the platform, date and sources returned. Repeated observations provide context for prioritizing updates."},
    ],
    links: seoIndustries.map(page => ({href: page.path, label: page.title})),
  },
  {
    path: "/value-realization", title: "ATG Value Realization Framework", eyebrow: "Measuring outcomes",
    description: "Agree what success means before work begins, track what changed, and document realized value when there is evidence.",
    cta: "Discuss your baseline", intake: serviceIntake("ai-readiness"),
    sections: [
      {title: "Baseline", text: "Agree the metric, measurement window, owner and source. Typical measures include cycle time, qualified inquiries, error rates and operating cost."},
      {title: "Projected value", text: "Model a scenario with named assumptions and dependencies. Keep capacity recovered, possible cash savings and project costs separate."},
      {title: "Observed change", text: "Measure again with consistent definitions and comparable periods. Record the source and explain business or seasonal changes that could affect attribution."},
      {title: "Realized value and review", text: "Count cash benefits only when supported by financial records. Review actual costs, unresolved assumptions and next steps in the agreed reporting cadence."},
    ],
    links: [{href: "/services/ai-readiness", label: "AI readiness assessment"}, {href: "/services/performance-monitoring", label: "Performance monitoring"}, {href: "/services/fractional-ai-leadership", label: "Fractional AI leadership"}],
  },
];

export function marketingPage(path: string) {
  return [...marketingPages, ...servicePages, ...seoIndustries].find(page => page.path === path.replace(/\/$/, ""));
}

export const marketingPaths = [...marketingPages, ...servicePages, ...seoIndustries].map(page => page.path);
export const relatedSearchPath = (site: typeof industrySites[number]) => seoIndustries.find(page => page.path === "/seo-aeo/" + site.slug)?.path ?? industryIntake(site);
