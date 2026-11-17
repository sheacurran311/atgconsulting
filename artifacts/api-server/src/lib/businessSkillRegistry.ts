/**
 * ATG curated business Skill registry.
 * Source identifiers verified against coreyhaines31/marketingskills.
 * Metadata references external methodology; it does not install or run
 * third-party code, connect provider accounts, or replace ATG's templates.
 */
export type AtgSkillArea = "sales" | "marketing" | "seo" | "operations" | "retention";
export type AtgSkillAudience = "internal" | "guided" | "dfy" | "free";
export interface AtgBusinessSkill {
  id: string;
  title: string;
  area: AtgSkillArea;
  description: string;
  audiences: ReadonlyArray<AtgSkillAudience>;
  consultantAction: string;
  evidenceRequired: string;
  humanApproval: boolean;
  source: string;
}
const source = (id: string) => `https://github.com/coreyhaines31/marketingskills/blob/main/skills/${id}/SKILL.md`;
const skill = (id:string,title:string,area:AtgSkillArea,description:string,audiences:AtgSkillAudience[],consultantAction:string,evidenceRequired:string):AtgBusinessSkill=>({
  id,title,area,description,audiences,consultantAction,evidenceRequired,humanApproval:true,source:source(id)
});

export const atgBusinessSkills: ReadonlyArray<AtgBusinessSkill> = [
  skill("prospecting","Qualified prospect research","sales","Identify relevant SMB prospects with dated, verifiable fit signals.",["internal","guided","dfy"],"Research companies, record sources, and recommend operator-reviewed outreach.","Business website, dated public evidence, and contact confidence."),
  skill("customer-research","Customer research","marketing","Document the customer's buyer needs and decision process.",["internal","guided","dfy"],"Interview owner, segment customers, and distinguish evidence from assumptions.","Interview notes, sample size, and dated supporting sources."),
  skill("competitor-profiling","Competitor profiles","marketing","Compare positioning, offers, and observable competitors.",["internal","guided","dfy"],"Create a sourced comparison with strengths, gaps, and uncertainty.","Official competitor pages and access dates."),
  skill("cold-email","Outreach copy","sales","Prepare personalized business outreach for review.",["internal","dfy"],"Draft evidence-based outreach, never deliver automatically.","Approved audience, claim evidence, contact compliance review."),
  skill("sales-enablement","Sales enablement","sales","Clarify qualification, objections, proposals, and conversion workflows.",["internal","guided","dfy"],"Map the selling process and produce reusable, reviewed collateral.","Current sales process, stage definitions, and reviewed claims."),
  skill("revops","Revenue operations","sales","Define lead stages, ownership, follow-up, and pipeline metrics.",["internal","guided","dfy"],"Map CRM handoffs and create pipeline review cadence.","Agreed definitions for leads, stages, outcomes."),
  skill("offers","Offer design","marketing","Improve packaging and clarity of commercial offers.",["internal","guided","dfy"],"Compare options with economics and customer fit.","Existing price sheet, delivery constraints, buyer evidence."),
  skill("pricing","Pricing strategy","marketing","Evaluate price and package tradeoffs.",["guided","dfy"],"Model alternatives without promising revenue improvements.","Known unit economics and explicit assumptions."),
  skill("product-marketing","Positioning and messaging","marketing","Connect offer, audience, proof, and differentiation.",["internal","guided","dfy"],"Draft a positioning brief for client sign-off.","Approved value propositions and evidence for claims."),
  skill("marketing-plan","Practical marketing plan","marketing","Select achievable channels, budgets, tasks, and measures.",["internal","guided","dfy"],"Build a 30-day channel plan with named ownership.","Current channels, budget and capacity."),
  skill("content-strategy","Content strategy","marketing","Define topics aligned with buyer intent and business results.",["internal","guided","dfy"],"Build editorial pillars and channel cadence.","Audience, search intent and approved source material."),
  skill("social","Social content","marketing","Prepare platform-appropriate drafts and calendars.",["internal","dfy"],"Produce drafts for human review; customer controls publication.","Brand voice, reviewed sources and publication approval."),
  skill("copywriting","Conversion copywriting","marketing","Improve page and campaign messaging.",["internal","guided","dfy"],"Propose revised copy and substantiate claims.","Current page, conversion goal, approved facts."),
  skill("emails","Lifecycle messaging","marketing","Design permitted customer email journeys and templates.",["internal","guided","dfy"],"Prepare flow and content; configure through customer platform, not ATG OAuth.","Consent model, segments, approved copy, opt-out handling."),
  skill("seo-audit","Technical and on-page SEO","seo","Identify crawl, indexing, metadata, and content quality issues.",["internal","guided","dfy","free"],"Run public checks and assess relevant GSC evidence when authorized.","URL findings, check dates, relevant Search Console evidence."),
  skill("ai-seo","AI search visibility","seo","Measure and improve evidence-based AI search discoverability.",["internal","guided","dfy"],"Assess citations and discoverability with repeatable samples.","Dated prompts, sources, and comparison method."),
  skill("site-architecture","Site information architecture","seo","Improve useful page organization and internal paths.",["guided","dfy"],"Propose a crawlable information architecture.","Current URL inventory, intent mapping and crawl evidence."),
  skill("schema","Structured data","seo","Identify structured-data opportunities for supported page types.",["dfy"],"Review proposed markup and validate against actual page content.","Page content, validator output and schema eligibility."),
  skill("analytics","Marketing measurement","operations","Define usable metrics with source and time-window context.",["internal","guided","dfy"],"Configure measurement plan; use only approved GSC/GA4 OAuth for customer SEO data.","Metric definitions, baselines and reports."),
  skill("attribution","Attribution interpretation","operations","Interpret channel evidence and uncertainty responsibly.",["internal","dfy"],"Compare reported acquisition against campaign results.","Source definitions, windows, and data caveats."),
  skill("cro","Conversion optimization","marketing","Prioritize conversion friction and testable hypotheses.",["internal","guided","dfy"],"Review funnels and draft scoped experiments.","Observed page behavior and conversion baselines."),
  skill("ab-testing","Controlled experiments","marketing","Design outcome-driven tests with guardrails.",["dfy"],"Define variants and success metrics before testing.","Hypothesis, allocation, volume and stop conditions."),
  skill("marketing-loops","Repeatable growth workflows","operations","Document reliable acquisition and follow-up loops.",["internal","dfy"],"Design native customer-owned execution and manual ATG oversight.","Trigger, cadence, success criteria and recovery path."),
  skill("lead-magnets","Free tool acquisition","marketing","Build conversion paths from valuable free diagnostics.",["internal"],"Define diagnostic, lead capture and consented follow-up.","Tool utility, conversion flow and consent disclosures."),
  skill("free-tools","Free diagnostic design","marketing","Prioritize standalone tools that solve a real SMB problem.",["internal","free"],"Specify useful diagnostics and Guided/DIFY upgrade points.","Actual diagnostic output and no-charge access."),
  skill("onboarding","Client onboarding","operations","Create repeatable engagement kickoff and handoff.",["guided","dfy"],"Confirm scope, owner, dates and acceptance tests.","Signed scope and task acceptance."),
  skill("churn-prevention","Retention planning","retention","Identify customer loss signals without intrusive tracking.",["dfy"],"Design a consented customer review process.","Observed outcomes and agreed response rules."),
  skill("referrals","Referral programs","retention","Create transparent customer referral workflows.",["dfy"],"Prepare opt-in referral program and reporting.","Approved offer and eligibility rules."),
];

export function skillsForAudience(audience:AtgSkillAudience):AtgBusinessSkill[] {
  return atgBusinessSkills.filter(s=>s.audiences.includes(audience));
}
