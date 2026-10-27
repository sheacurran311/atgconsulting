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

Grok Bot (at [grok.com](/go/grok-bot?src=knowledge)) is xAI's AI assistant. It has a skill library you can add ATG workflows to, and a routine builder you create by chatting with Grok.

## What you need
- An X Premium subscription (x.com)
- Optionally: Gmail or Google Workspace to connect

## Step 1 — Install a skill from ATG
1. Download your SKILL.md from the ATG Workbench (My Workflows → ↓ Install).
2. Open Grok at grok.com and go to the **Skills** tab in the left sidebar.
3. Click **Add skill → Import from file** and upload your SKILL.md.
4. Your skill is now saved. Trigger it anytime by typing **/** followed by the skill name in any Grok chat.

## Step 2 — Connect Gmail or Calendar (optional)
1. In Grok, go to **Settings → Connections**.
2. Click **Add connection** and choose Gmail or Google Calendar.
3. Authorise with your Google account. Grok will only read or draft — it won't send anything automatically unless you configure it to.

## Step 3 — Create a routine (scheduled)
1. Start a chat with Grok and say: *"Create a routine that runs [skill name] every [Monday at 8am / daily at 9am]."*
2. Grok will set up the routine and confirm the schedule.
3. You can view and edit routines in **Settings → Routines**.

## Approval-first rule
Every ATG skill is designed to produce a draft for your review — not to send automatically. If Grok asks whether to send something, always review the draft first.

## Common issues
- **Skill not appearing**: re-upload the SKILL.md file from the Skills tab.
- **Routine didn't run**: check your X Premium subscription is active.
- **Wrong output**: start a chat, trigger the skill with /, and paste a fresh example.
`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: ["grok_bot"] },
    sortOrder: 10,
  },
  {
    slug: "claude-getting-started",
    title: "Getting started with Claude",
    body: `# Getting started with Claude

Claude (at [claude.ai](/go/claude?src=knowledge)) uses **Projects** and **Skills** to store persistent instructions. Scheduling requires a free [Zapier](/go/zapier?src=knowledge) or Make account.

## What you need
- A Claude.ai account (free or Pro)
- For scheduling: a Zapier account (free tier works for one Zap)

## Step 1 — Install a skill
**Option A — ZIP upload (recommended):**
1. Download your SKILL.md from ATG Workbench (My Workflows → ↓ Install).
2. Create a ZIP file named after the skill (e.g. *lead-follow-up.zip*) containing your SKILL.md renamed to *skill.md*.
3. In Claude, open or create a **Project**. Go to **Project Settings → Skills → Upload ZIP**.
4. Upload the ZIP. Claude will confirm the skill is installed.

**Option B — Project Instructions:**
1. Open a Claude Project and click **Project Settings**.
2. Paste the content of your SKILL.md into the **Instructions** field.
3. Save. The instructions apply to every conversation in that Project.

## Step 2 — Run a skill on demand
In your Project, type the trigger phrase from the SKILL.md (e.g. *"Run lead follow-up"*). Review Claude's draft before using it.

## Step 3 — Schedule via Zapier
1. Sign in to [Zapier](/go/zapier?src=knowledge). Create a new Zap.
2. Trigger: **Schedule by Zapier** → set your frequency (daily, weekly, etc.).
3. Action: **Claude → Send message** → select your Project → paste the routine prompt from your SKILL.md.
4. Add a second action: **Gmail → Create draft** (so the output lands as a draft for your review, not auto-sent).
5. Test and turn on.

## Approval-first rule
Route Claude's output to a draft email or a Slack message for review. Never connect Claude directly to a send action.
`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: ["claude"] },
    sortOrder: 11,
  },
  {
    slug: "chatgpt-getting-started",
    title: "Getting started with ChatGPT",
    body: `# Getting started with ChatGPT

ChatGPT (at [chatgpt.com](/go/chatgpt?src=knowledge)) uses **custom GPTs** for persistent skills and **Scheduled Tasks** for automated routines.

## What you need
- ChatGPT Plus, Team, Business, or Enterprise account
- For GPT Actions (connecting to apps): Plus or above
- For Skills within GPTs: Business, Enterprise, or Education only (not Plus)

## Step 1 — Create a custom GPT
1. Go to chatgpt.com → click your name → **My GPTs → Create a GPT**.
2. Give it a name matching the workflow (e.g. *Lead Follow-up*).
3. In the **Instructions** field, paste the System Prompt section from your SKILL.md.
4. Set visibility to **Only me**.
5. Click **Save**.

## Step 2 — Connect apps via Actions (Plus and above)
1. In the GPT editor, click **Add actions**.
2. Use official API schemas (available at platform.openai.com/docs/actions) for Gmail, Google Calendar, or other services.
3. Test with a sample request before enabling the GPT.

## Step 3 — Schedule a task (Scheduled Tasks — Plus and above)
1. Open a regular ChatGPT chat (not inside a GPT).
2. Type: *"Create a scheduled task: every [Monday at 8am], run [workflow name] for me."*
3. ChatGPT will set up the recurring task. You'll receive the output in chat at the scheduled time.
4. Note: Scheduled Tasks run in your main chat, not inside custom GPTs.

## Approval-first rule
Configure your GPT or scheduled task to produce a **draft** output. Always review before acting on any output — never set auto-send.

## Common issues
- **Actions not working**: confirm your Plus subscription is active and the API schema is valid.
- **Scheduled task missed**: check your ChatGPT notification settings and time zone.
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
