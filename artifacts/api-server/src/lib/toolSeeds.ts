/**
 * Tool database seed data.
 * Official URLs only. referralUrl left blank for Shea to fill in after joining programs.
 * Pricing notes are plain text descriptions — no invented prices.
 * Called on server start if Tool table is empty.
 */

export interface ToolSeed {
  slug: string;
  name: string;
  category: string;
  description: string;
  bestForVerticals: string[];
  pricingNote: string;
  officialUrl: string;
  referralUrl: string;
  hasReferral: boolean;
  referralNotes: string;
  platformsSupported: string[];
  setupGuideLink: string;
  logo: string;
  featured: boolean;
  sortOrder: number;
}

export const TOOL_SEEDS: ToolSeed[] = [
  // ── AI platforms ─────────────────────────────────────────────────────────────
  {
    slug: "grok-bot",
    name: "Grok Bot",
    category: "ai_platform",
    description: "xAI's Grok with custom actions, scheduled tasks, and Gmail/Calendar connectors. ATG's first recommendation for installing workflow routines.",
    bestForVerticals: ["home_services", "real_estate", "restaurants", "professional_services", "independent_sales", "coaches"],
    pricingNote: "Requires an X Premium subscription. Check x.com for current pricing.",
    officialUrl: "https://x.com/grok",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "",
    platformsSupported: ["grok_bot"],
    setupGuideLink: "",
    logo: "",
    featured: true,
    sortOrder: 1,
  },
  {
    slug: "claude",
    name: "Claude",
    category: "ai_platform",
    description: "Anthropic's Claude with Projects, custom instructions, and API access. Excellent for document-heavy workflows and writing tasks.",
    bestForVerticals: ["professional_services", "coaches", "independent_sales"],
    pricingNote: "Free tier available. Claude Pro adds priority access and Projects. Check claude.ai for current pricing.",
    officialUrl: "https://claude.ai",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "",
    platformsSupported: ["claude"],
    setupGuideLink: "",
    logo: "",
    featured: true,
    sortOrder: 2,
  },
  {
    slug: "chatgpt",
    name: "ChatGPT",
    category: "ai_platform",
    description: "OpenAI's ChatGPT with custom GPTs, Actions, and integrations. Broad ecosystem of plugins and connectors.",
    bestForVerticals: ["home_services", "real_estate", "restaurants", "professional_services", "independent_sales", "coaches"],
    pricingNote: "Free tier available. ChatGPT Plus adds GPT-4, custom GPTs, and Actions. Check chatgpt.com for current pricing.",
    officialUrl: "https://chatgpt.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "",
    platformsSupported: ["chatgpt"],
    setupGuideLink: "",
    logo: "",
    featured: true,
    sortOrder: 3,
  },
  {
    slug: "cursor",
    name: "Cursor",
    category: "dev_tool",
    description: "AI-native code editor. Relevant for clients interested in building custom automations or maintaining their own scripts.",
    bestForVerticals: ["professional_services", "coaches"],
    pricingNote: "Free tier available. Pro plan adds more AI uses per month. Check cursor.com for current pricing.",
    officialUrl: "https://cursor.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "",
    platformsSupported: [],
    setupGuideLink: "",
    logo: "",
    featured: false,
    sortOrder: 4,
  },
  {
    slug: "replit",
    name: "Replit",
    category: "dev_tool",
    description: "Browser-based coding and hosting platform. Good for clients who want to self-host simple automations.",
    bestForVerticals: ["professional_services", "coaches"],
    pricingNote: "Free tier available. Core plan adds more compute and storage. Check replit.com for current pricing.",
    officialUrl: "https://replit.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "",
    platformsSupported: [],
    setupGuideLink: "",
    logo: "",
    featured: false,
    sortOrder: 5,
  },

  // ── Productivity ─────────────────────────────────────────────────────────────
  {
    slug: "google-workspace",
    name: "Google Workspace",
    category: "productivity",
    description: "Gmail, Calendar, Drive, Docs, Sheets, and Meet — the most common small-business suite ATG workflows connect to.",
    bestForVerticals: ["home_services", "real_estate", "restaurants", "professional_services", "independent_sales", "coaches"],
    pricingNote: "Business Starter through Enterprise plans. Pricing per user per month; check workspace.google.com for current rates.",
    officialUrl: "https://workspace.google.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "Google Workspace referral program available; Shea to fill in.",
    platformsSupported: ["grok_bot", "claude", "chatgpt"],
    setupGuideLink: "",
    logo: "",
    featured: true,
    sortOrder: 10,
  },
  {
    slug: "notion",
    name: "Notion",
    category: "productivity",
    description: "All-in-one workspace for notes, databases, and project management. Good for storing workflow outputs and client knowledge bases.",
    bestForVerticals: ["professional_services", "coaches", "independent_sales"],
    pricingNote: "Free personal plan. Plus and Business plans for teams. Check notion.so for current pricing.",
    officialUrl: "https://notion.so",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "",
    platformsSupported: [],
    setupGuideLink: "",
    logo: "",
    featured: false,
    sortOrder: 11,
  },

  // ── Scheduling ───────────────────────────────────────────────────────────────
  {
    slug: "calendly",
    name: "Calendly",
    category: "scheduling",
    description: "Meeting and appointment scheduling. Powers the booking reminder workflow; connects to Google and Outlook calendars.",
    bestForVerticals: ["professional_services", "coaches", "independent_sales", "real_estate"],
    pricingNote: "Free plan for basic scheduling. Standard and Teams plans add workflows and customization. Check calendly.com for current pricing.",
    officialUrl: "https://calendly.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "",
    platformsSupported: ["grok_bot", "claude", "chatgpt"],
    setupGuideLink: "",
    logo: "",
    featured: false,
    sortOrder: 20,
  },

  // ── Payments ─────────────────────────────────────────────────────────────────
  {
    slug: "stripe",
    name: "Stripe",
    category: "payments",
    description: "Online payments and invoicing. The money-snapshot workflow can read Stripe revenue data.",
    bestForVerticals: ["home_services", "professional_services", "coaches", "restaurants"],
    pricingNote: "Pay-as-you-go transaction fees; no monthly fee. Check stripe.com for current rates.",
    officialUrl: "https://stripe.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "",
    platformsSupported: [],
    setupGuideLink: "",
    logo: "",
    featured: false,
    sortOrder: 30,
  },

  // ── Accounting ───────────────────────────────────────────────────────────────
  {
    slug: "quickbooks",
    name: "QuickBooks Online",
    category: "accounting",
    description: "Small-business accounting and bookkeeping. The money-snapshot workflow can pull revenue and expense summaries.",
    bestForVerticals: ["home_services", "real_estate", "restaurants", "professional_services"],
    pricingNote: "Simple Start through Advanced plans. Pricing changes frequently; check quickbooks.intuit.com for current rates.",
    officialUrl: "https://quickbooks.intuit.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "Intuit partner/referral program available; Shea to fill in.",
    platformsSupported: [],
    setupGuideLink: "",
    logo: "",
    featured: false,
    sortOrder: 31,
  },

  // ── CRM ──────────────────────────────────────────────────────────────────────
  {
    slug: "hubspot-crm",
    name: "HubSpot CRM",
    category: "crm",
    description: "Free CRM for tracking leads, contacts, and deals. Works with lead follow-up and prospect research workflows.",
    bestForVerticals: ["independent_sales", "professional_services", "real_estate"],
    pricingNote: "Free CRM core features. Marketing, Sales, and Service Hubs have paid tiers. Check hubspot.com for current pricing.",
    officialUrl: "https://hubspot.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "HubSpot partner program available; Shea to fill in.",
    platformsSupported: [],
    setupGuideLink: "",
    logo: "",
    featured: false,
    sortOrder: 40,
  },

  // ── Design ───────────────────────────────────────────────────────────────────
  {
    slug: "canva",
    name: "Canva",
    category: "design",
    description: "Visual design tool for social posts, presentations, and marketing materials. Pairs with the social calendar workflow.",
    bestForVerticals: ["restaurants", "coaches", "real_estate", "home_services"],
    pricingNote: "Free plan covers most basics. Canva Pro adds more templates and brand kits. Check canva.com for current pricing.",
    officialUrl: "https://canva.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "Canva affiliate program available; Shea to fill in.",
    platformsSupported: [],
    setupGuideLink: "",
    logo: "",
    featured: false,
    sortOrder: 50,
  },

  // ── Social media ─────────────────────────────────────────────────────────────
  {
    slug: "buffer",
    name: "Buffer",
    category: "social_media",
    description: "Social media scheduling and analytics. Output from the social calendar workflow can be queued here for approval before publishing.",
    bestForVerticals: ["restaurants", "coaches", "real_estate", "home_services"],
    pricingNote: "Free plan for up to 3 channels. Essentials and Team plans add more channels and analytics. Check buffer.com for current pricing.",
    officialUrl: "https://buffer.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "",
    platformsSupported: [],
    setupGuideLink: "",
    logo: "",
    featured: false,
    sortOrder: 51,
  },

  // ── Automation ───────────────────────────────────────────────────────────────
  {
    slug: "zapier",
    name: "Zapier",
    category: "automation",
    description: "No-code automation between 6,000+ apps. Use with Claude or ChatGPT for scheduled workflow triggers where native scheduling isn't available.",
    bestForVerticals: ["home_services", "real_estate", "restaurants", "professional_services", "independent_sales", "coaches"],
    pricingNote: "Free plan includes basic Zaps. Starter and Professional plans add more Zaps and steps. Check zapier.com for current pricing.",
    officialUrl: "https://zapier.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "Zapier affiliate program available; Shea to fill in.",
    platformsSupported: ["claude", "chatgpt"],
    setupGuideLink: "",
    logo: "",
    featured: false,
    sortOrder: 60,
  },
  {
    slug: "make",
    name: "Make (formerly Integromat)",
    category: "automation",
    description: "Visual automation builder with advanced flow control. Alternative to Zapier with more flexible branching and data transformations.",
    bestForVerticals: ["professional_services", "independent_sales", "coaches"],
    pricingNote: "Free plan includes limited operations per month. Core and Pro plans add more. Check make.com for current pricing.",
    officialUrl: "https://make.com",
    referralUrl: "",
    hasReferral: false,
    referralNotes: "Make affiliate program available; Shea to fill in.",
    platformsSupported: ["claude", "chatgpt"],
    setupGuideLink: "",
    logo: "",
    featured: false,
    sortOrder: 61,
  },
];

/** Upsert all seeds into the Tool table if they don't exist yet. */
export async function seedTools(prisma: { tool: { findFirst: Function; upsert: Function } }) {
  const existing = await prisma.tool.findFirst();
  if (existing) return; // already seeded

  for (const seed of TOOL_SEEDS) {
    await prisma.tool.upsert({
      where: { slug: seed.slug },
      update: {},
      create: {
        slug: seed.slug,
        name: seed.name,
        category: seed.category,
        description: seed.description,
        bestForVerticals: JSON.stringify(seed.bestForVerticals),
        pricingNote: seed.pricingNote,
        officialUrl: seed.officialUrl,
        referralUrl: seed.referralUrl,
        hasReferral: seed.hasReferral,
        referralNotes: seed.referralNotes,
        platformsSupported: JSON.stringify(seed.platformsSupported),
        setupGuideLink: seed.setupGuideLink,
        logo: seed.logo,
        featured: seed.featured,
        sortOrder: seed.sortOrder,
      },
    });
  }
}
