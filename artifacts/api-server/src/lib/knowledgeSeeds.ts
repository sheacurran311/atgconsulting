/**
 * Knowledge article seed data.
 * Articles are admin-editable markdown. Missing slugs are created. Existing rows stay.
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
  {
    slug: "review-an-ai-draft",
    title: "How to review an AI draft",
    body: `# How to review an AI draft

Read the draft as if a new employee wrote it.

Check three things: every fact matches what you provided, the ask is the one you wanted, and the voice is one you would send.

Delete any detail you did not supply. If a sentence promises a price, a date, or a discount, confirm it before you keep it.

Then decide: send, edit, or discard. The assistant does not make that decision.`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: [] },
    sortOrder: 110,
  },
  {
    slug: "prompt-checklist",
    title: "A prompt checklist",
    body: `# A prompt checklist

Before you send a request, confirm:

- Who the draft is for
- What finished looks like
- The facts that must stay true
- What the draft must not promise
- How long it should be

If one of those is missing, add it. A shorter checklist you actually use beats a long one you skip.`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: [] },
    sortOrder: 120,
  },
  {
    slug: "what-not-to-paste",
    title: "What not to paste into an assistant",
    body: `# What not to paste into an assistant

Leave out passwords, API keys, card numbers, government ID numbers, and health details.

Leave out customer information your own rules say must stay in another system.

If you only need the shape of a message, replace names with "the customer."

The vendor's privacy terms are on the vendor's site. This app does not connect to your assistant account.`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: [] },
    sortOrder: 130,
  },
  {
    slug: "email-into-a-template",
    title: "Turn one email into a template",
    body: `# Turn one email into a template

Start from an email you already send often.

Mark the sentences that stay the same. Mark the blanks: name, date, job.

Write the standing text and the blanks as a saved instruction in your own assistant. Add a line that says you review the draft before it is used.

Run it once with sample details you are allowed to share.`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: [] },
    sortOrder: 140,
  },
  {
    slug: "compare-assistants",
    title: "Compare assistants on one task",
    body: `# Compare assistants on one task

Grok, Claude, and ChatGPT are general assistants from different companies. Menus and plans change. Check each vendor's site for what is included.

To compare, use the same prompt and the same non-sensitive notes in the tool your team can already open. If you try a second tool, keep the prompt the same.

Keep the draft that needed fewer factual fixes. There is no universal ranking.`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: [] },
    sortOrder: 150,
  },
  {
    slug: "note-time-saved",
    title: "Note time on one task",
    body: `# Note time on one task

Write the start time and the finish time for one real run, including your review.

Do it again the next time that task shows up. Two notes are a record. They are not a study and not a percentage to publish.

If the second job was harder, say so. Do not smooth the numbers.`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: [] },
    sortOrder: 160,
  },
  {
    slug: "share-a-template",
    title: "Share one template with a team",
    body: `# Share one template with a team

Give the template a job name. Write when to use it and when not to.

Name the inputs the person must paste, and name who reviews the draft before it goes to a customer.

Show one person how to run it. Change the instruction based on what confused them before you ask anyone else to use it.`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: [] },
    sortOrder: 170,
  },
  {
    slug: "you-stay-in-control",
    title: "You stay in control",
    body: `# You stay in control

A connector can read mail, a calendar, or files after you approve that access in the assistant's own settings.

Read what you are granting. Leave off any setting that sends, posts, or deletes without a person, until you mean to turn it on.

ATG does not store those passwords and does not run the assistant for you. You start the task and you review the draft.`,
    tags: { verticals: [], tiers: ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"], platforms: [] },
    sortOrder: 180,
  },
];

/** Create any missing article seeds. Existing rows are not overwritten. */
export async function seedKnowledgeArticles(prisma: {
  knowledgeArticle: {
    findUnique: (args: { where: { slug: string } }) => Promise<{ id: string } | null>;
    create: (args: { data: { slug: string; title: string; body: string; tags: string; sortOrder: number } }) => Promise<unknown>;
  };
}) {
  for (const seed of ARTICLE_SEEDS) {
    const existing = await prisma.knowledgeArticle.findUnique({ where: { slug: seed.slug } });
    if (existing) continue;
    await prisma.knowledgeArticle.create({
      data: {
        slug: seed.slug,
        title: seed.title,
        body: seed.body,
        tags: JSON.stringify(seed.tags),
        sortOrder: seed.sortOrder,
      },
    });
  }
}
