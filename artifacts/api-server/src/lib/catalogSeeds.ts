/**
 * Catalog seed data — sourced only from ATG's existing templates and verified tools.
 * No invented listings or URLs. sourceUrl left blank until officially verified.
 * Admin can add real external listings via the import UI.
 */

export interface CatalogSeed {
  name: string;
  sourceType: string;
  sourceUrl: string;
  description: string;
  howItHelps: string;
  tags: { departments: string[]; tasks: string[]; industries: string[] };
  tierFit: string;
  verified: boolean;
  referralUrl: string;
}

// Seeds from ATG's own workflow templates (always verified — we build them)
export const ATG_TEMPLATE_SEEDS: CatalogSeed[] = [
  {
    name: "Lead Follow-up Drafter",
    sourceType: "atg_template",
    sourceUrl: "",
    description: "Drafts a personalised follow-up email when you enter a contact name and last interaction.",
    howItHelps: "Saves 20–30 min per follow-up. You review the draft before sending anything.",
    tags: { departments: ["sales"], tasks: ["follow_up", "email_management"], industries: [] },
    tierFit: "SELF_SERVE",
    verified: true,
    referralUrl: "",
  },
  {
    name: "Inbox Triage Assistant",
    sourceType: "atg_template",
    sourceUrl: "",
    description: "Reads email summaries you paste in, sorts by urgency, and drafts replies for the top items.",
    howItHelps: "Cuts email processing time by half. Nothing is sent — you copy and send yourself.",
    tags: { departments: ["general_admin", "customer_support"], tasks: ["email_management", "customer_replies"], industries: [] },
    tierFit: "SELF_SERVE",
    verified: true,
    referralUrl: "",
  },
  {
    name: "Review Request Generator",
    sourceType: "atg_template",
    sourceUrl: "",
    description: "Writes a friendly review request for a named customer and recent service.",
    howItHelps: "Consistent, personalised review requests in seconds. You choose who and when.",
    tags: { departments: ["marketing", "customer_support"], tasks: ["notifications", "email_management"], industries: ["home_services", "restaurants", "professional_services"] },
    tierFit: "SELF_SERVE",
    verified: true,
    referralUrl: "",
  },
  {
    name: "Social Content Calendar",
    sourceType: "atg_template",
    sourceUrl: "",
    description: "Generates a week of social media posts tailored to your business type and current events.",
    howItHelps: "7 platform-ready posts in under 2 minutes. Approve the batch before scheduling.",
    tags: { departments: ["marketing"], tasks: ["social_content", "document_creation"], industries: [] },
    tierFit: "SELF_SERVE",
    verified: true,
    referralUrl: "",
  },
  {
    name: "Local SEO Audit",
    sourceType: "atg_template",
    sourceUrl: "",
    description: "Reviews your Google Business profile, local citations, and keyword gaps for your area.",
    howItHelps: "Ranked action list of SEO fixes, prioritised by impact. No agency required.",
    tags: { departments: ["marketing"], tasks: ["reporting", "tracking"], industries: ["home_services", "real_estate", "restaurants"] },
    tierFit: "SELF_SERVE",
    verified: true,
    referralUrl: "",
  },
  {
    name: "Weekly Money Snapshot",
    sourceType: "atg_template",
    sourceUrl: "",
    description: "Pastes your revenue and expenses into a plain-English weekly summary with cash flags.",
    howItHelps: "Know your numbers every week without a spreadsheet session.",
    tags: { departments: ["finance"], tasks: ["reporting", "tracking"], industries: [] },
    tierFit: "GUIDED",
    verified: true,
    referralUrl: "",
  },
  {
    name: "Booking & Reminder Flow",
    sourceType: "atg_template",
    sourceUrl: "",
    description: "Sends confirmation and 24-hour reminder messages for scheduled appointments.",
    howItHelps: "Fewer no-shows, less back-and-forth. Works with your existing calendar.",
    tags: { departments: ["operations", "general_admin"], tasks: ["scheduling", "notifications"], industries: ["home_services", "professional_services", "coaches"] },
    tierFit: "GUIDED",
    verified: true,
    referralUrl: "",
  },
  {
    name: "Quote Proposal Writer",
    sourceType: "atg_template",
    sourceUrl: "",
    description: "Builds a professional quote from your scope notes and pricing. You review before sending.",
    howItHelps: "Same-day quotes instead of same-week. Consistent format, your numbers.",
    tags: { departments: ["sales", "operations"], tasks: ["quoting", "document_creation"], industries: ["home_services", "professional_services"] },
    tierFit: "GUIDED",
    verified: true,
    referralUrl: "",
  },
  {
    name: "Prospect Research Brief",
    sourceType: "atg_template",
    sourceUrl: "",
    description: "Builds a qualified prospect list from your target criteria — business type, location, size.",
    howItHelps: "Focused outreach list in minutes. Verify contacts before reaching out.",
    tags: { departments: ["sales"], tasks: ["lead_research", "data_entry"], industries: [] },
    tierFit: "GUIDED",
    verified: true,
    referralUrl: "",
  },
  {
    name: "FAQ Support Reply Drafter",
    sourceType: "atg_template",
    sourceUrl: "",
    description: "Reads customer questions and drafts replies using your FAQ knowledge base.",
    howItHelps: "Consistent support replies drafted in seconds. You approve before sending.",
    tags: { departments: ["customer_support"], tasks: ["customer_replies", "email_management"], industries: [] },
    tierFit: "WHITE_GLOVE",
    verified: true,
    referralUrl: "",
  },
];

// Seeds from the tool database (Grok Bot, Claude, ChatGPT — officially verified platforms)
// sourceUrl left blank — admin fills in verified marketplace URLs
export const PLATFORM_CATALOG_SEEDS: CatalogSeed[] = [
  {
    name: "Grok Bot (xAI)",
    sourceType: "grok_bot_template",
    sourceUrl: "https://grok.com",
    description: "xAI's AI assistant with skill library, scheduled routines, and Gmail/Calendar connectors.",
    howItHelps: "The primary platform for running ATG workflow skills. Skills installed via the Skills tab.",
    tags: { departments: [], tasks: [], industries: [] },
    tierFit: "all",
    verified: true,
    referralUrl: "",
  },
  {
    name: "Claude Projects (Anthropic)",
    sourceType: "claude_skill",
    sourceUrl: "https://claude.ai",
    description: "Claude's Projects with custom instructions and skill file uploads for persistent AI workflows.",
    howItHelps: "Supports ATG SKILL.md upload via Settings → Skills. Scheduled via Zapier.",
    tags: { departments: [], tasks: [], industries: [] },
    tierFit: "all",
    verified: true,
    referralUrl: "",
  },
  {
    name: "ChatGPT Custom GPT",
    sourceType: "chatgpt_gpt",
    sourceUrl: "https://chatgpt.com",
    description: "Custom GPTs with system instructions and Actions for connecting to external apps.",
    howItHelps: "Supports ATG SKILL.md in the Instructions field. Scheduled Tasks via main chat.",
    tags: { departments: [], tasks: [], industries: [] },
    tierFit: "all",
    verified: true,
    referralUrl: "",
  },
];

/** Seed catalog items if the table is empty. */
export async function seedCatalog(prisma: {
  catalogItem: { findFirst: Function; create: Function; findUnique: Function };
}) {
  const existing = await prisma.catalogItem.findFirst();
  if (existing) return;

  const allSeeds = [...ATG_TEMPLATE_SEEDS, ...PLATFORM_CATALOG_SEEDS];
  for (const seed of allSeeds) {
    await prisma.catalogItem.create({
      data: {
        name:        seed.name,
        sourceType:  seed.sourceType,
        sourceUrl:   seed.sourceUrl,
        description: seed.description,
        howItHelps:  seed.howItHelps,
        tags:        JSON.stringify(seed.tags),
        tierFit:     seed.tierFit,
        verified:    seed.verified,
        referralUrl: seed.referralUrl,
        reviewStatus: seed.verified ? "approved" : "pending",
        verifiedAt: seed.verified ? new Date() : null,
        verifiedBy: seed.verified ? "system" : null,
      },
    });
  }
}
