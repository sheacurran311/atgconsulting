/**
 * Consultant-only Guided playbook modules for nontechnical SMB clients.
 * These are practical, reusable methods, not automatic client deliverables.
 */
export interface GuidedModule {
  id: string;
  title: string;
  objective: string;
  discovery: string[];
  resources: string[];
  implementation: string[];
  acceptance: string[];
  monitoring: string[];
  skills: string[];
}
export const guidedConsultantModules: ReadonlyArray<GuidedModule> = [
  {
    id: "business-assessment", title: "Business baseline and AI readiness",
    objective: "Document the client's highest-cost manual work and what success would look like.",
    discovery: ["What service or product generates revenue?", "Where are leads first captured?", "Which repeated task consumes the most time?", "Who approves changes and spending?"],
    resources: ["Existing intake", "Client software inventory", "Business goals and baseline worksheet"],
    implementation: ["Record current process, triggers, owner, and failure modes.", "Prioritize one low-risk pilot and document scope exclusions.", "Confirm whether any client-supplied data requires restricted handling."],
    acceptance: ["A named workflow, baseline, owner, measurable outcome, and approval rule are saved."],
    monitoring: ["Review observed completion time, intervention frequency, and exception reports."],
    skills: ["customer-research", "marketing-plan"],
  },
  {
    id: "positioning", title: "Customer research, offers and positioning",
    objective: "Make the company's value proposition clear enough for an unfamiliar buyer.",
    discovery: ["Who buys and why now?", "Which alternatives do buyers compare?", "How is pricing decided?"],
    resources: ["Competitor URLs", "Current product and service descriptions", "Existing proposal and price sheet"],
    implementation: ["Gather dated evidence about customer needs and competitors.", "Draft three positioning options and explain tradeoffs.", "Review proposed offer and pricing with the client before publishing."],
    acceptance: ["The client approves a target segment, differentiated offer, and evidence-backed messaging."],
    monitoring: ["Revisit inquiry quality and buyer objections at agreed intervals."],
    skills: ["customer-research", "competitor-profiling", "offers", "pricing", "product-marketing"],
  },
  {
    id: "website-visibility", title: "Website, SEO and AI visibility",
    objective: "Translate website visibility data into prioritized, client-understandable actions.",
    discovery: ["Which pages matter commercially?", "Which search terms indicate intent?", "Who controls the website?"],
    resources: ["Public crawl and website checklist", "Search Console/GA4 property access (read-only OAuth when enabled)", "Search baseline and target pages"],
    implementation: ["Inspect public indexing and on-page issues.", "For connected Guided accounts, compare GSC search metrics and GA4 on-site conversions separately.", "Draft fixes with evidence, effort, confidence and expected direction; obtain approval before changes."],
    acceptance: ["A baseline, dated findings and a top-three remediation backlog exist."],
    monitoring: ["Weekly change detection on priority URLs; monthly consultant review and explanation."],
    skills: ["seo-audit", "ai-seo", "analytics", "cro", "site-architecture"],
  },
  {
    id: "marketing", title: "Marketing strategy and content operations",
    objective: "Build a realistic acquisition plan a nonmarketer can execute.",
    discovery: ["Which channels already bring good customers?", "Who creates and approves content?", "What is the available budget and capacity?"],
    resources: ["Brand guide", "Past campaign results", "Content calendar template"],
    implementation: ["Choose one or two channels and an achievable cadence.", "Define content pillars and create a review queue.", "Show the client how to schedule content inside their own platform; do not connect social OAuth."],
    acceptance: ["The owner approves a month-long plan with responsibilities and tracking."],
    monitoring: ["Review qualified inquiries and campaign outcomes rather than vanity metrics alone."],
    skills: ["content-strategy", "social", "copywriting", "emails", "marketing-plan"],
  },
  {
    id: "sales-process", title: "Lead handling and sales follow-up",
    objective: "Reduce dropped inquiries and make follow-up predictable without unauthorized messaging.",
    discovery: ["Where are leads recorded?", "What qualifies a lead?", "What are typical response times and loss reasons?"],
    resources: ["Customer-owned CRM walkthrough", "Pipeline stage worksheet", "Follow-up template examples"],
    implementation: ["Map the pipeline and stage definitions.", "Create follow-up templates and owner-assigned tasks.", "Configure native CRM or email platform steps with the client, without ATG OAuth."],
    acceptance: ["One sample lead reaches a documented stage and produces an approved follow-up draft."],
    monitoring: ["Measure qualified leads, booked consultations, response time and win rate."],
    skills: ["prospecting", "sales-enablement", "revops", "cold-email"],
  },
  {
    id: "handoff", title: "Verification, training and managed-service handoff",
    objective: "Make delivery independently repeatable and establish support boundaries.",
    discovery: ["Who operates the system after the engagement?", "Who approves public or consequential actions?", "What constitutes a failure?"],
    resources: ["Client-specific implementation list", "Acceptance-test sheet", "Operating guide and pause instructions"],
    implementation: ["Run positive, negative and recovery scenarios in the client-owned platform.", "Record redacted evidence and unresolved limitations.", "Publish only consultant-reviewed recap and client operating guide.", "Offer a separately scoped Do-It-For-You care proposal where appropriate."],
    acceptance: ["The owner can inspect, pause and recover the process; signed scope and handoff are recorded."],
    monitoring: ["Schedule an agreed follow-up and track unresolved support actions."],
    skills: ["analytics", "marketing-loops"],
  },
];
