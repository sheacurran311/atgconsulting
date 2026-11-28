import { transformationServices, transformationServiceFor } from "./transformationServices";
import { automationBots } from "./automationLibrary";
import { TEMPLATE_SEEDS, PHASE2_SEEDS, PHASE3_SEEDS } from "./templates";
import { guidedConsultantModules } from "./guidedConsultantModules";

type Links = { recipes: readonly string[]; templates: readonly string[]; modules: readonly string[]; gap: string };
/** Explicit references to existing catalog entries, not new deployments or entitlements. */
export const serviceWorkflowLinks: Readonly<Record<string, Links>> = {
  "ai-readiness": {recipes:[],templates:[],modules:["business-assessment"],gap:"Readiness scoring and evidence worksheet"},
  "workflow-engineering": {recipes:["morning-work-brief","lead-follow-up-queue","inbox-priority-digest","customer-reply-drafts","quote-request-tracker","invoice-deadline-watch","weekly-receivables-summary","support-escalation-brief","meeting-prep-brief","meeting-action-review","lead-register-hygiene","project-deadline-watch","new-client-kickoff-prep","team-weekly-brief","calendar-conflict-digest"],templates:["follow-up","inbox-triage","money-snapshot","booking-flow","quote-proposal"],modules:["sales-process","handoff"],gap:"Validate client-native integrations per scope"},
  "context-engineering": {recipes:["customer-reply-drafts","document-change-digest"],templates:["faq-support"],modules:["business-assessment","handoff"],gap:"Permission-aware context assembly and evaluation"},
  "agentic-automation": {recipes:["prospect-research-watch","customer-reply-drafts"],templates:["agent-pipeline","prospect-research"],modules:["handoff"],gap:"Bounded agent execution and evaluation"},
  "custom-tools": {recipes:[],templates:[],modules:["business-assessment","handoff"],gap:"Custom application specification; no generic implementation claim"},
  "digital-transformation": {recipes:["social-planning-digest","review-reply-queue","prospect-research-watch","lead-follow-up-queue"],templates:["seo-audit","social-calendar","review-request","booking-flow","prospect-research"],modules:["positioning","website-visibility","marketing","sales-process"],gap:"Website and custom integration scope"},
  "knowledge-management": {recipes:["document-change-digest","procedure-drift-review","customer-reply-drafts"],templates:["faq-support"],modules:["handoff"],gap:"Permission-aware knowledge retrieval and citations"},
  "ai-governance": {recipes:["procedure-drift-review","support-escalation-brief"],templates:[],modules:["business-assessment","handoff"],gap:"Formal policy, risk and authorization review"},
  "ai-training": {recipes:[],templates:[],modules:["handoff"],gap:"Role-specific learning and acceptance plan"},
  "voice-ai": {recipes:[],templates:[],modules:["business-assessment","handoff"],gap:"Vendor and inbound pilot validation required"},
  "performance-monitoring": {recipes:["weekly-client-status","project-deadline-watch","procedure-drift-review","support-escalation-brief"],templates:[],modules:["website-visibility","handoff"],gap:"Live execution telemetry is not established"},
  "fractional-ai-leadership": {recipes:["weekly-client-status","team-weekly-brief","renewal-deadline-watch","meeting-action-review","project-deadline-watch"],templates:[],modules:["business-assessment","handoff"],gap:"Recurring advisory agreement, roadmap and decision log"}
};

export function workflowCandidates(serviceId:string) {
  if (!transformationServices.some(s=>s.id===serviceId)) return null;
  const links=serviceWorkflowLinks[serviceId];
  if (!links) return null;
  const seeds=[...TEMPLATE_SEEDS,...PHASE2_SEEDS,...PHASE3_SEEDS];
  return {serviceId,
    recipes:automationBots.filter(b=>b.audience!=="personal"&&links.recipes.includes(b.id)).map(b=>({id:b.id,title:b.name})),
    templates:seeds.filter(t=>links.templates.includes(t.slug)).map(t=>({id:t.slug,title:t.name})),
    modules:guidedConsultantModules.filter(m=>links.modules.includes(m.id)).map(m=>({id:m.id,title:m.title})),
    gap:links.gap, status:"candidate-only" as const};
}
export function candidatesForGoal(goal:string) {
  const service=transformationServiceFor(goal);
  return service ? workflowCandidates(service.id) : null;
}
