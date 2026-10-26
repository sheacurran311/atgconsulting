/**
 * Knowledge article seed data.
 * Articles are admin-editable markdown; seeded from code if the table is empty.
 * Full platform guides and vertical FAQs are in this file.
 * Tags: { verticals: string[], tiers: string[], platforms: string[] }
 */

export interface ArticleSeed {
  slug: string;
  title: string;
  body: string;
  tags: { verticals: string[]; tiers: string[]; platforms: string[] };
  sortOrder: number;
}

export const ARTICLE_SEEDS: ArticleSeed[] = [
  // ── Platform guides ────────────────────────────────────────────────────────
  {
    slug: "grok-bot-getting-started",
    title: "Getting started with Grok Bot",
    body: `# Getting started with Grok Bot

Grok Bot (at [x.com/grok](/go/grok-bot?src=knowledge)) is xAI's AI assistant with support for custom actions, scheduled tasks, and direct connections to Gmail and Google Calendar.

## What you need
- An X Premium subscription
- A Gmail or Google Workspace account (optional but recommended)

## Connect your email and calendar
1. Open Grok Bot at x.com/grok
2. Click your profile icon → **Settings → Connections**
3. Click **Add connection** and choose **Gmail**
4. Authorize with your Google account — Grok will request read and send access
5. Repeat for **Google Calendar** if you want calendar-aware routines

## Install a workflow skill
1. Download the SKILL.md file from your ATG Workbench (My Workflows → ↓ Install)
2. In Grok, start a new conversation and paste the full SKILL.md content as the first message
3. Grok will confirm it has loaded the skill
4. To use it on demand: start a new chat and type the trigger phrase from the SKILL.md

## Create a scheduled routine
1. Go to **Scheduled Tasks** in Grok settings
2. Click **New task**
3. Paste the trigger prompt from your SKILL.md
4. Set the schedule (daily at 8am, weekly on Monday, etc.)
5. Enable **Approval before send** if the workflow sends emails

## Approval-first rule
Every ATG workflow has an approval step built in. Grok will show you the draft before sending anything. **Never configure auto-send for email or calendar actions without reviewing.**

## Common issues
- **Grok can't find an email**: check your Gmail connection is authorized and the label/folder permissions are granted
- **Scheduled task didn't run**: verify your X Premium subscription is active and the schedule is saved
- **Skill not working as expected**: re-paste the SKILL.md and confirm the version matches what ATG generated
`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: ["grok_bot"] },
    sortOrder: 10,
  },
  {
    slug: "claude-getting-started",
    title: "Getting started with Claude",
    body: `# Getting started with Claude

Claude (at [claude.ai](/go/claude?src=knowledge)) is Anthropic's AI assistant. Claude Projects let you give Claude a persistent set of instructions — perfect for installing ATG workflow skills.

## What you need
- A Claude.ai account (free or Pro)
- For scheduled routines: a Zapier or Make account (Claude does not have native scheduling)

## Create a Project for your workflows
1. Open claude.ai and click **Projects** in the sidebar
2. Click **New Project** and name it "My ATG Workflows"
3. In **Project Instructions**, paste the SKILL.md content you downloaded from ATG Workbench
4. Save the project

## Use a skill on demand
1. Open your Project in Claude
2. Type the trigger phrase from the SKILL.md (e.g. "Run lead follow-up for [contact name]")
3. Review the draft Claude produces before copying or sending anything

## Schedule a routine via Zapier
1. Sign in to [Zapier](/go/zapier?src=knowledge)
2. Create a new Zap: Trigger = **Schedule by Zapier** (set your frequency)
3. Action = **Claude** (send a message to your Project with the trigger prompt)
4. Add a second step to email yourself the output for review
5. Never use auto-send — always review before sending

## Connect Gmail or Calendar in Zapier
1. In your Zap, add a **Gmail** or **Google Calendar** action step
2. Authenticate with your Google account
3. Configure the step to send the Claude output as a draft (not auto-send)

## Approval-first rule
Every ATG workflow produces a draft for your review. In Zapier, always route Claude output to a draft email or a review step — never directly to a send action.
`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: ["claude"] },
    sortOrder: 11,
  },
  {
    slug: "chatgpt-getting-started",
    title: "Getting started with ChatGPT",
    body: `# Getting started with ChatGPT

ChatGPT (at [chatgpt.com](/go/chatgpt?src=knowledge)) lets you create custom GPTs with system instructions and Actions (API connections to external apps).

## What you need
- A ChatGPT account (free or Plus)
- For GPT Actions: a ChatGPT Plus or Team subscription
- For scheduled routines: a Zapier or Make account

## Create a custom GPT for your workflows
1. Open chatgpt.com and click **Explore GPTs → Create**
2. Name it "My ATG Workflow"
3. Under **Instructions**, paste the SKILL.md content from ATG Workbench
4. Click **Save** and set visibility to **Only me**

## Connect Gmail or Calendar via Actions
1. In your GPT editor, click **Add actions**
2. Search for Gmail or Google Calendar schemas (available from the OpenAI community or generate via ATG)
3. Authenticate your Google account
4. Test the connection with a sample read request first

## Schedule a routine via Zapier
1. Sign in to [Zapier](/go/zapier?src=knowledge)
2. Trigger = **Schedule by Zapier**
3. Action = **ChatGPT** → send a message to your custom GPT
4. Add a review step before any send action

## Approval-first rule
Configure ChatGPT GPT Actions to **draft** — not auto-send. Always review output before it goes anywhere.
`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: ["chatgpt"] },
    sortOrder: 12,
  },

  // ── Glossary ───────────────────────────────────────────────────────────────
  {
    slug: "glossary",
    title: "Glossary: plain-English AI terms",
    body: `# Glossary

**AI platform** — An AI chat tool you subscribe to (Grok Bot, Claude, ChatGPT). This is where your workflow routines actually run.

**Approval-first** — Every ATG workflow delivers a draft to your inbox for your review before anything is sent or published. Nothing goes out automatically.

**Automation** — A task that runs on a schedule or trigger without you starting it manually each time.

**SKILL.md** — A file that tells your AI platform how to run a specific workflow. You download it from ATG Workbench and paste it into Grok Bot, Claude, or ChatGPT.

**Routine** — A scheduled automation that runs on a fixed schedule (daily, weekly, etc.) inside your AI platform.

**Tool plan** — Your personalised list of software tools recommended for your specific business, generated from your intake answers.

**Workflow** — A sequence of automated steps that produces a specific output (a draft email, a social post, a lead list).

**Workflow template** — A reusable workflow design that can be adapted for different clients and industries.

**Zapier / Make** — No-code automation platforms that connect different apps and can trigger AI routines on a schedule.
`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: [] },
    sortOrder: 100,
  },
];

/** Upsert all article seeds if the table is empty. */
export async function seedKnowledgeArticles(prisma: {
  knowledgeArticle: { findFirst: Function; upsert: Function };
}) {
  const existing = await prisma.knowledgeArticle.findFirst();
  if (existing) return;

  for (const seed of ARTICLE_SEEDS) {
    await prisma.knowledgeArticle.upsert({
      where: { slug: seed.slug },
      update: {},
      create: {
        slug: seed.slug,
        title: seed.title,
        body: seed.body,
        tags: JSON.stringify(seed.tags),
        sortOrder: seed.sortOrder,
      },
    });
  }
}
