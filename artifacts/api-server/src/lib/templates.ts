/**
 * Workflow template seeds.
 * These are the code-default definitions. Admin can edit them in the DB.
 * llm.ts loads the active DB version at runtime; falls back to these.
 *
 * Each template can be exported as a SKILL.md so clients can paste it into
 * Grok Bot / Claude / ChatGPT and run the workflow themselves.
 *
 * Client approval of every output is always on — nothing is sent automatically.
 */

export interface WorkflowTemplateSeed {
  slug: string;
  name: string;
  description: string;
  verticalTags: string[]; // empty = all verticals
  minTier: string;
  systemPrompt: string;
  userPromptTemplate: string;
  inputSchema: string; // JSON Schema
  outputFormat: string;
}

export const COMMON_RULES = `
Rules:
- Return ONLY valid JSON matching the output schema. No prose outside JSON.
- Do not invent facts, statistics, testimonials, or client names.
- Do not name specific people without the user supplying those names.
- Nothing is sent automatically — the user reviews and copies the output.
- No tracking pixels, no "sent by AI" footers.
- Plain language. No jargon (no "agentic", "LLM", "RAG", "vector").
`.trim();

export const TEMPLATE_SEEDS: WorkflowTemplateSeed[] = [
  // ── 1. Follow-up draft (existing workflow, now template-driven) ─────────────
  {
    slug: "follow-up",
    name: "Follow-up email draft",
    description: "Write a single follow-up email for the user to review and copy. Nothing is sent automatically.",
    verticalTags: [],
    minTier: "SELF_SERVE",
    systemPrompt: `You write one follow-up email for a small-business owner to review and copy into their own mail app.
${COMMON_RULES}
Output schema: { "subject": string, "body": string }`,
    userPromptTemplate: `Write a follow-up email.
Who I am writing to: {{who}}
Last contact: {{lastTouch}}
What I want to say: {{wantToSay}}
My name: {{senderName}}`,
    inputSchema: JSON.stringify({
      type: "object",
      required: ["who", "lastTouch", "wantToSay"],
      properties: {
        who:       { type: "string", maxLength: 120 },
        lastTouch: { type: "string", maxLength: 500 },
        wantToSay: { type: "string", maxLength: 1000 },
      },
    }),
    outputFormat: '{ "subject": string, "body": string }',
  },

  // ── 2. Inbox triage ───────────────────────────────────────────────────────
  {
    slug: "inbox-triage",
    name: "Inbox triage and reply drafts",
    description: "Paste inbound messages. The workflow classifies each one by urgency and type, then drafts a reply. The user reviews and copies each draft.",
    verticalTags: [],
    minTier: "SELF_SERVE",
    systemPrompt: `You triage inbound business messages and draft replies.
For each message: classify urgency (urgent / normal / low), classify type (inquiry / complaint / compliment / request / other), and draft a short, plain reply in the sender's voice.
${COMMON_RULES}
Output schema: { "items": [{ "index": number, "preview": string (first 60 chars), "urgency": "urgent"|"normal"|"low", "type": "inquiry"|"complaint"|"compliment"|"request"|"other", "draftReply": string }] }`,
    userPromptTemplate: `Triage these inbound messages and draft replies.
My name: {{senderName}}
My business: {{businessDescription}}
Messages (one per line, numbered):
{{messages}}`,
    inputSchema: JSON.stringify({
      type: "object",
      required: ["messages"],
      properties: {
        messages: { type: "string", minLength: 1, maxLength: 8000, description: "Paste messages, one per line or separated by ---" },
        businessDescription: { type: "string", maxLength: 300, description: "Optional: one sentence about the business" },
      },
    }),
    outputFormat: '{ "items": [{ "index", "preview", "urgency", "type", "draftReply" }] }',
  },

  // ── 3. Review request messages ────────────────────────────────────────────
  {
    slug: "review-request",
    name: "Review request messages",
    description: "Generates short review request messages for one or more channels (text, email, in-person script). Also drafts replies to positive and negative reviews the user pastes in.",
    verticalTags: [],
    minTier: "SELF_SERVE",
    systemPrompt: `You write review request messages and review reply drafts for a small business.
Review requests: short, warm, specific. No fake urgency. Do not beg.
Review replies: genuine, brief. Thank for positives. For negatives: acknowledge, apologise briefly, offer to resolve — no blame.
${COMMON_RULES}
Output schema: { "requestMessages": [{ "channel": string, "message": string }], "reviewReplies": [{ "review": string (preview), "reply": string }] }`,
    userPromptTemplate: `Write review request messages and reply drafts.
Business name: {{businessName}}
Business type: {{businessType}}
Channels for requests (e.g. SMS, email, in-person): {{channels}}
Sender name: {{senderName}}
{{#reviews}}
Reviews to reply to:
{{reviews}}
{{/reviews}}`,
    inputSchema: JSON.stringify({
      type: "object",
      required: ["businessName", "businessType", "channels"],
      properties: {
        businessName: { type: "string", maxLength: 100 },
        businessType: { type: "string", maxLength: 100 },
        channels:     { type: "string", maxLength: 200, description: "e.g. SMS, email, in-person" },
        reviews:      { type: "string", maxLength: 5000, description: "Optional: paste reviews to reply to" },
      },
    }),
    outputFormat: '{ "requestMessages": [{ "channel", "message" }], "reviewReplies": [{ "review", "reply" }] }',
  },

  // ── 4. Social content calendar ────────────────────────────────────────────
  {
    slug: "social-calendar",
    name: "Social content calendar and post drafts",
    description: "Generates a 2–4 week content calendar and post drafts for the selected platforms and cadence. The user reviews and copies each post.",
    verticalTags: [],
    minTier: "SELF_SERVE",
    systemPrompt: `You write a social content calendar and post drafts for a small business.
Calendar: plan posts by day and platform for the requested period.
Drafts: write each post in a plain, conversational voice. No hashtag walls. No emojis unless the user asked. No fake engagement lines ("Drop a comment!").
${COMMON_RULES}
Output schema: { "calendarWeeks": [{ "week": number, "posts": [{ "day": string, "platform": string, "topic": string, "draft": string }] }] }`,
    userPromptTemplate: `Create a social content calendar and drafts.
Business: {{businessDescription}}
Current offers or news: {{offers}}
Platforms: {{platforms}}
Posts per week per platform: {{cadence}}
Weeks to plan: {{weeks}}`,
    inputSchema: JSON.stringify({
      type: "object",
      required: ["businessDescription", "platforms", "cadence", "weeks"],
      properties: {
        businessDescription: { type: "string", minLength: 1, maxLength: 400 },
        offers:   { type: "string", maxLength: 500, description: "Optional: promotions or news to feature" },
        platforms: { type: "string", minLength: 1, maxLength: 200, description: "e.g. Instagram, Facebook, LinkedIn" },
        cadence:  { type: "number", minimum: 1, maximum: 7, description: "Posts per week per platform" },
        weeks:    { type: "number", minimum: 1, maximum: 4 },
      },
    }),
    outputFormat: '{ "calendarWeeks": [{ "week", "posts": [{ "day", "platform", "topic", "draft" }] }] }',
  },

  // ── 5. Local SEO audit ────────────────────────────────────────────────────
  {
    slug: "seo-audit",
    name: "Local SEO audit with fix list",
    description: "Fetches the page server-side (no paid APIs), checks title/meta/headings/NAP/schema markup/mobile, and returns a prioritised fix list. Notes where Ahrefs or GSC would add data.",
    verticalTags: ["trades", "realestate", "hospitality", "professional", "salesrep", "solo"],
    minTier: "SELF_SERVE",
    systemPrompt: `You are a local SEO specialist writing an audit report for a small-business website.
You receive raw HTML of the page, the business type, and the target city/area.
Analyse: title tag, meta description, H1/H2, NAP (name/address/phone) consistency, schema markup (LocalBusiness, breadcrumb, FAQ), page speed signals (render-blocking noted from HTML only), mobile-friendly indicators, internal links, image alt text, GBP (Google Business Profile) checklist.
Prioritise findings: P0 = missing/broken, P1 = weak but present, P2 = improvements.
Note explicitly where Ahrefs, Google Search Console, or PageSpeed Insights would add data that you cannot assess from the HTML alone.
${COMMON_RULES}
Output schema: { "pageTitle": string, "metaDescription": string, "h1": string, "findings": [{ "priority": "P0"|"P1"|"P2", "category": string, "issue": string, "fix": string, "toolNote": string|null }], "gbpChecklist": [{ "item": string, "done": boolean|null }] }`,
    userPromptTemplate: `Run a local SEO audit.
URL: {{url}}
Business type: {{businessType}}
City/area: {{cityArea}}
Page HTML (truncated to 20 000 chars):
{{html}}`,
    inputSchema: JSON.stringify({
      type: "object",
      required: ["url", "businessType"],
      properties: {
        url:          { type: "string", format: "uri", maxLength: 500 },
        businessType: { type: "string", maxLength: 100 },
        cityArea:     { type: "string", maxLength: 100, description: "Target city or service area" },
      },
    }),
    outputFormat: '{ "pageTitle", "metaDescription", "h1", "findings": [{ "priority", "category", "issue", "fix", "toolNote" }], "gbpChecklist": [{ "item", "done" }] }',
  },
];

/** Render a template as a SKILL.md for use in Grok Bot / Claude / ChatGPT */
// ── Per-workflow, per-platform routine prompts ────────────────────────────────
// Static — no AI needed. Clients copy-paste these into their scheduled task / routine.

export interface PlatformRoutinePrompt { grok_bot: string; claude: string; chatgpt: string }

export const ROUTINE_PROMPTS: Record<string, PlatformRoutinePrompt> = {
  "follow-up": {
    grok_bot: `Run my lead follow-up skill now. Use the context I last gave you, or ask me for the contact name and last touchpoint if you don't have it. Draft a short follow-up email and show it to me for approval before anything else.`,
    claude: `You are running my Lead Follow-up workflow. Ask me: (1) who I'm following up with, (2) what happened last time, (3) what I want to say. Then draft a short, personalised follow-up email and show me the draft. Wait for my approval before considering the task done. Do not send anything.`,
    chatgpt: `Run my ATG Lead Follow-up skill. Ask for: contact name, last touchpoint, and goal of the follow-up. Write a concise follow-up email draft. Show me the draft and wait for me to say "approved" before doing anything else.`,
  },
  "inbox-triage": {
    grok_bot: `Run my inbox triage skill. I'll paste some emails or describe what's in my inbox. Sort them by urgency, flag anything that needs a reply today, and draft short reply starters for the top 3 urgent items. Show me everything before sending or filing anything.`,
    claude: `You are running my Inbox Triage workflow. I'll paste email summaries or subject lines. Categorise each one (urgent reply / follow up later / no action), then draft a reply for each urgent item. Present everything as a triage report. Wait for my review before proceeding.`,
    chatgpt: `Run my ATG Inbox Triage skill. I'll paste email subjects or summaries. Sort by: (1) needs reply today, (2) follow up this week, (3) no action needed. Draft replies for urgent items. Show me the full triage report and wait for approval.`,
  },
  "review-request": {
    grok_bot: `Run my review request skill. I'll provide a customer name and recent job/service details. Write a short, friendly review request message. Show it to me first — do not send it.`,
    claude: `You are running my Review Request workflow. Ask me: customer name, what we did for them, and which review platform (Google, Yelp, etc.). Write a brief, personalised review request. Show me the draft and wait for my go-ahead before anything is sent.`,
    chatgpt: `Run my ATG Review Request skill. I need to know: customer name, service completed, and preferred review site. Write a warm review request (2-3 sentences max). Show me the draft first and do not send until I approve.`,
  },
  "social-calendar": {
    grok_bot: `Run my social calendar skill. I'll tell you my business type and any events or promotions this week. Draft 5 social media posts (mix of educational, behind-the-scenes, and promotional). Show me all 5 for review — do not post anything.`,
    claude: `You are running my Social Content Calendar workflow. Ask me: business type, the week's key dates or promotions, and preferred tone. Create 5 social media posts for the week. Present them as a numbered list with suggested posting day. Wait for my approval.`,
    chatgpt: `Run my ATG Social Calendar skill. Tell me your business type and this week's news or offers first. Write 5 social posts — vary the format (tip, story, promo, Q&A, call to action). Show me the calendar view and wait for my approval before scheduling anything.`,
  },
  "seo-audit": {
    grok_bot: `Run my local SEO audit skill. My business website is [ENTER YOUR URL]. Check for common local SEO issues: Google Business profile completeness, local keywords, mobile-friendliness signals, and citation consistency. Give me a ranked action list.`,
    claude: `You are running my Local SEO Audit workflow. Ask me for: website URL, business name, city/location, and main service category. Research and summarise the top SEO issues and a prioritised action list. Present findings clearly — no jargon.`,
    chatgpt: `Run my ATG Local SEO Audit skill. I need: my website URL, business name, location, and the main service I provide. Audit my local SEO and give me a prioritised list of fixes, starting with the highest-impact items.`,
  },
  "money-snapshot": {
    grok_bot: `Run my money snapshot skill. I'll paste this week's revenue and main expenses as text or CSV. Summarise in plain English: total income, main expenses, net, and one financial flag I should pay attention to.`,
    claude: `You are running my Weekly Money Snapshot workflow. Ask me to paste my income and expense data for the week (text or numbers are fine). Summarise in 3-5 plain sentences: income, expenses, net, and any flag worth noting. No jargon.`,
    chatgpt: `Run my ATG Money Snapshot skill. I'll paste my income and expenses for the week. Write a plain-English summary: total in, total out, net, and one thing I should watch. Keep it under 100 words.`,
  },
  "booking-flow": {
    grok_bot: `Run my booking reminder skill. I have an upcoming appointment with [CUSTOMER NAME] on [DATE/TIME] for [SERVICE]. Write a confirmation message and a reminder to send 24 hours before. Show both for my review first.`,
    claude: `You are running my Booking & Reminder workflow. Ask me: customer name, appointment date and time, service type, and contact method (text or email). Write a confirmation message and a 24-hour reminder. Show me both drafts — I'll copy and send them myself.`,
    chatgpt: `Run my ATG Booking Flow skill. I need: customer name, appointment details, and service. Write a booking confirmation and a reminder message. Show me both drafts before I use them. Do not send anything automatically.`,
  },
  "quote-proposal": {
    grok_bot: `Run my quote proposal skill. I'll describe the job scope, my pricing, and the customer's name. Write a clean, professional quote or proposal. Show me the draft — I'll review and send it myself.`,
    claude: `You are running my Quote Proposal workflow. Ask me for: customer name, job description, pricing breakdown, and any terms or conditions. Write a professional proposal. Present it as a draft for my review. I'll copy it into my own document and send it.`,
    chatgpt: `Run my ATG Quote Proposal skill. I'll give you: customer name, scope of work, price breakdown, and my business name. Write a professional quote. Show me the complete draft. Wait for my approval — do not send or file anything.`,
  },
  "prospect-research": {
    grok_bot: `Run my prospect research skill. I'm looking for [TYPE OF BUSINESS] in [LOCATION] that might need [YOUR SERVICE]. Find 5 potential leads with business name, contact type, and a brief note on why they might be a fit. Show me the list for review.`,
    claude: `You are running my Prospect Research workflow. Ask me: what kind of business I'm targeting, where (city/region), and what I offer. Research and list 5 qualified prospects with name, type, location, and why they're a fit. Present as a table for my review.`,
    chatgpt: `Run my ATG Prospect Research skill. I need to know: target business type, location, and what I offer. Find 5 potential leads with name, contact type, and fit notes. Show me the list — I'll decide who to reach out to.`,
  },
  "faq-support": {
    grok_bot: `Run my FAQ support skill. I'll paste 3-5 customer support questions. Draft a clear, helpful reply for each one. Show me all the drafts — do not send them.`,
    claude: `You are running my FAQ Support Reply workflow. Ask me to paste the customer questions. Using my FAQ knowledge, draft a reply for each. Format as: Question | Draft Reply. Wait for my review before these are used.`,
    chatgpt: `Run my ATG FAQ Support skill. Paste the customer questions you want me to address. I'll draft a clear answer for each. Show me all replies and wait for my approval before they're sent or published.`,
  },
};

// ── Inputs descriptions (human-readable, no JSON Schema) ─────────────────────

const INPUT_DESCRIPTIONS: Record<string, string[]> = {
  "follow-up":       ["Contact name and company (or role)", "What happened last — e.g. 'had a call on Monday, they asked for pricing'", "What you want to achieve with this message"],
  "inbox-triage":    ["Paste email subjects or short summaries from your inbox", "Optionally: your email categories or priority flags"],
  "review-request":  ["Customer name", "What service or product they received", "Which review platform (Google, Yelp, Facebook, etc.)"],
  "social-calendar": ["Your business type", "This week's news, offers, or events you want to feature (optional)", "Preferred tone — professional, friendly, casual, etc."],
  "seo-audit":       ["Your website URL", "Business name and main location", "Primary service category"],
  "money-snapshot":  ["Paste this week's income and expenses as text or CSV rows"],
  "booking-flow":    ["Customer name", "Appointment date, time, and service", "Preferred contact method (email or text)"],
  "quote-proposal":  ["Customer name", "Detailed scope of work", "Your price breakdown", "Any special terms or conditions"],
  "prospect-research":["Type of business you're targeting", "Location or territory", "What service you're offering them"],
  "faq-support":     ["Paste the customer question(s) — up to 5 at a time", "Optionally: any key context about your business or policies"],
};

const QUALITY_CHECKS: Record<string, string[]> = {
  "follow-up":       ["Does the tone sound like you?", "Is the contact name spelled correctly?", "Does it reference the right meeting/topic?"],
  "inbox-triage":    ["Is the urgency ranking right for your actual priorities?", "Are the draft replies in your voice?"],
  "review-request":  ["Is it warm but not pushy?", "Is the review platform link correct?"],
  "social-calendar": ["Do the posts sound like your business?", "Are dates and offers accurate?", "Would you actually post this?"],
  "seo-audit":       ["Are the flagged issues actually on your site? Verify one manually before acting."],
  "money-snapshot":  ["Do the numbers match what's actually in your books? This is a summary only."],
  "booking-flow":    ["Are the date, time, and customer name correct?", "Is the link or location included if needed?"],
  "quote-proposal":  ["Are all the numbers right?", "Does it include everything the customer asked for?", "Read it aloud — does it sound professional?"],
  "prospect-research":["Do these businesses actually exist? Verify before outreach."],
  "faq-support":     ["Is the answer accurate for your specific policies?", "Is the tone appropriate for the customer's situation?"],
};

const CONNECTORS_NEEDED: Record<string, string[]> = {
  "follow-up":        ["Email (Gmail / Outlook) — optional, for reviewing drafts in your inbox"],
  "inbox-triage":     ["Email (Gmail / Outlook) — paste summaries rather than connecting live if preferred"],
  "review-request":   ["None required — copy the draft and send manually"],
  "social-calendar":  ["Buffer or Hootsuite — optional, to queue approved posts; or copy manually"],
  "seo-audit":        ["None required — results are research-based"],
  "money-snapshot":   ["None required — paste your data"],
  "booking-flow":     ["Calendar (Google / Outlook) — for appointment details; or enter manually"],
  "quote-proposal":   ["None required — copy the draft into your document or CRM"],
  "prospect-research":["None required — results are research-based; export to your CRM manually"],
  "faq-support":      ["Help desk or email — optional; paste questions manually"],
};

// ── renderSkillMd ─────────────────────────────────────────────────────────────

export function renderSkillMd(
  t: {
    slug: string; name: string; description: string;
    minTier: string; verticalTags: string; systemPrompt: string;
    userPromptTemplate: string; inputSchema: string; outputFormat: string;
  },
  /** When provided, the code is embedded in a first-run verification instruction. */
  verificationCode?: string,
  /** Client intake context for personalising the export (optional). */
  intakeContext?: { businessName?: string; senderName?: string; industry?: string },
): string {
  // agent-pipeline is a multi-step in-app preview only — not standalone exportable
  if (t.slug === "agent-pipeline") {
    return [
      `---`,
      `name: ${t.slug}`,
      `slug: ${t.slug}`,
      `exportable: false`,
      `---`,
      ``,
      `# ${t.name}`,
      ``,
      `This workflow is designed as an in-app preview only.`,
      `To chain multiple ATG workflows, install each one individually in your AI platform`,
      `and connect them using a Zapier or Make automation, or by running them sequentially`,
      `in a scheduled routine.`,
      ``,
      `Contact Shea via the operator thread to design a multi-step chain for your business.`,
    ].join("\n");
  }

  const tags: string[] = (() => { try { return JSON.parse(t.verticalTags) as string[]; } catch { return []; } })();

  // Slugified folder name for Claude ZIP (lowercase-hyphen)
  const folderName = t.slug;

  // Strip {{#...}} Handlebars block helpers from exported prompts (keep only {{variable}})
  function stripHelpers(s: string): string {
    return s.replace(/\{\{[#/^][^}]+\}\}/g, "").replace(/\n{3,}/g, "\n\n").trim();
  }

  // Personalise user prompt template with intake data where available
  const personalised = stripHelpers(t.userPromptTemplate)
    .replace(/\{\{senderName\}\}/g, intakeContext?.senderName ?? "{{YOUR_NAME}}")
    .replace(/\{\{businessName\}\}/g, intakeContext?.businessName ?? "{{YOUR_BUSINESS}}")
    .replace(/\{\{industry\}\}/g, intakeContext?.industry ?? "{{YOUR_INDUSTRY}}");

  // Strip "Return ONLY valid JSON" from the exported system prompt
  const exportSystemPrompt = stripHelpers(t.systemPrompt)
    .replace(/- Return ONLY valid JSON matching the output schema\. No prose outside JSON\.\n?/g, "")
    .replace(/- Return ONLY valid JSON\.[^\n]*\n?/g, "")
    .trim();

  const inputs = INPUT_DESCRIPTIONS[t.slug] ?? ["(See user prompt template below)"];
  const quality = QUALITY_CHECKS[t.slug] ?? ["Review the output carefully before using it."];
  const connectors = CONNECTORS_NEEDED[t.slug] ?? [];
  const routinePrompts = ROUTINE_PROMPTS[t.slug];

  const verifyBlock = verificationCode ? [
    ``,
    `## First-run verification`,
    ``,
    `**On your very first run of this skill only, before doing anything else, print this exact line:**`,
    ``,
    "```",
    `ATG verification code: ${verificationCode}`,
    "```",
    ``,
    `Then continue with the normal workflow. Copy the code back into your ATG portal to confirm the skill is running.`,
    `Do not print the code on any subsequent runs.`,
  ] : [];

  return [
    `---`,
    `name: ${folderName}`,
    `slug: ${t.slug}`,
    `description: "${t.description.replace(/"/g, "'")}"`,
    `tier: ${t.minTier.toLowerCase().replace("_", "-")}`,
    `verticals: ${tags.length ? tags.join(", ") : "all"}`,
    `platform_support: Grok Bot, Claude, ChatGPT`,
    ...(verificationCode ? [`verification_code: ${verificationCode}`] : []),
    `---`,
    ``,
    `# ${t.name}`,
    ``,
    t.description,
    ``,
    `## When to use`,
    ``,
    `Use this skill when you need to ${t.description.charAt(0).toLowerCase() + t.description.slice(1)}.`,
    ``,
    `## What you need to provide`,
    ``,
    inputs.map((i) => `- ${i}`).join("\n"),
    ...(connectors.length ? [
      ``,
      `## Accounts to connect (in your AI platform)`,
      ``,
      connectors.length > 0
        ? connectors.map((c) => `- ${c}`).join("\n")
        : `No connectors required — paste your data directly.`,
    ] : []),
    ``,
    `## System instructions`,
    ``,
    `Paste this block as your assistant's **system prompt** or **project instructions**:`,
    ``,
    "```",
    exportSystemPrompt,
    "```",
    ``,
    `## How to trigger this skill`,
    ``,
    `Paste this prompt when you're ready to run the workflow:`,
    ``,
    "```",
    personalised || t.userPromptTemplate,
    "```",
    ...(routinePrompts ? [
      ``,
      `## Scheduled routine prompts`,
      ``,
      `Use one of these as your scheduled task or routine trigger (no AI required to set up):`,
      ``,
      `**Grok Bot routine:**`,
      "```",
      routinePrompts.grok_bot,
      "```",
      ``,
      `**Claude (Zapier / scheduled):**`,
      "```",
      routinePrompts.claude,
      "```",
      ``,
      `**ChatGPT (Scheduled Tasks or GPT trigger):**`,
      "```",
      routinePrompts.chatgpt,
      "```",
    ] : []),
    ...verifyBlock,
    ``,
    `## Quality checks before using the output`,
    ``,
    quality.map((q) => `- ${q}`).join("\n"),
    ``,
    `## What you'll get`,
    ``,
    t.outputFormat || "A draft output ready for your review.",
    ``,
    `---`,
    `## ⚠ Approval required before anything is sent`,
    ``,
    `This skill produces a **draft only**.`,
    ``,
    `Before using any output:`,
    ``,
    `☑ Read the entire draft carefully`,
    `☑ Check all names, dates, and facts are correct`,
    `☑ Make any edits you need`,
    `☑ Only then copy it into your email, social app, or document and use it yourself`,
    ``,
    `**Nothing is sent or published automatically.** Your AI platform does not have permission`,
    `to send on your behalf unless you explicitly configure that — and ATG recommends you don't.`,
  ].join("\n");
}

// ── Phase 2 seeds (minTier: GUIDED) ─────────────────────────────────────────

// Append to TEMPLATE_SEEDS array at module init time
// (handled by the runtime: these are pushed in the file's initial array literal)

export const PHASE2_SEEDS: WorkflowTemplateSeed[] = [
  // ── 5. Weekly money snapshot ─────────────────────────────────────────────
  {
    slug: "money-snapshot",
    name: "Weekly money snapshot",
    description: "Paste CSV transactions or a P&L summary. Outputs a plain-English weekly summary, cash flags, and questions for your accountant. No bank integrations.",
    verticalTags: [],
    minTier: "GUIDED",
    systemPrompt: `You summarise a week of financial data for a small-business owner in plain English.
Input may be CSV rows (date, description, amount) or a plain-text P&L summary.
Output:
- A 3-5 sentence plain-English weekly summary (income, expenses, net)
- Up to 5 cash flags (unusual items, overdue invoices, unexpected charges)
- Up to 5 questions to ask the accountant
${COMMON_RULES}
Do not invent figures not present in the input. If amounts are unclear, note the uncertainty.
Output schema: { "summary": string, "cashFlags": string[], "accountantQuestions": string[] }`,
    userPromptTemplate: `Week ending: {{weekEnding}}
Business: {{businessName}}

Financial data:
{{data}}`,
    inputSchema: JSON.stringify({
      type: "object",
      required: ["data"],
      properties: {
        weekEnding:   { type: "string", description: "e.g. 2026-10-25" },
        businessName: { type: "string", maxLength: 100 },
        data: { type: "string", minLength: 1, maxLength: 20000, description: "CSV rows or plain-text P&L summary" },
      },
    }),
    outputFormat: '{ "summary": string, "cashFlags": string[], "accountantQuestions": string[] }',
  },

  // ── 6. Booking and reminder flow ─────────────────────────────────────────
  {
    slug: "booking-flow",
    name: "Booking page copy and message sequences",
    description: "Generates booking-page copy, confirmation/reminder/no-show/rebook message sequences by channel, and a setup checklist for the client's scheduler.",
    verticalTags: ["trades", "professional", "solo"],
    minTier: "GUIDED",
    systemPrompt: `You write booking page copy and message sequences for a small-business service provider.
No fake reviews, no invented testimonials. Plain, warm language.
Sequences: confirmation, 24-hour reminder, day-of reminder, no-show follow-up, rebook offer.
${COMMON_RULES}
Output schema: { "bookingPageCopy": { "headline": string, "subheadline": string, "body": string }, "sequences": [{ "trigger": string, "channel": string, "message": string }], "setupChecklist": string[] }`,
    userPromptTemplate: `Business: {{businessName}}
Service types: {{serviceTypes}}
Scheduler platform: {{platform}}
Channels for messages: {{channels}}
Sender name: {{senderName}}`,
    inputSchema: JSON.stringify({
      type: "object",
      required: ["businessName", "serviceTypes", "platform", "channels"],
      properties: {
        businessName: { type: "string", maxLength: 100 },
        serviceTypes: { type: "string", maxLength: 300 },
        platform:     { type: "string", maxLength: 100, description: "e.g. Calendly, Google, Square Appointments" },
        channels:     { type: "string", maxLength: 200, description: "e.g. SMS, email" },
      },
    }),
    outputFormat: '{ "bookingPageCopy": { headline, subheadline, body }, "sequences": [{ trigger, channel, message }], "setupChecklist": string[] }',
  },

  // ── 7. Quotes, proposals and documents ───────────────────────────────────
  {
    slug: "quote-proposal",
    name: "Quote / proposal draft",
    description: "Generate a proposal or quote draft from the services, pricing, and scope the client provides. Export as Markdown or printable HTML.",
    verticalTags: ["trades", "professional", "solo"],
    minTier: "GUIDED",
    systemPrompt: `You write a professional proposal or quote for a small-business owner.
Use only the pricing, services, and scope the user supplies — never invent amounts or scope.
Include: overview, itemised services and prices, scope and deliverables, payment terms draft, scope-creep watch-outs.
${COMMON_RULES}
Output schema: { "proposalMarkdown": string, "scopeChecklist": string[], "termsChecklist": string[] }`,
    userPromptTemplate: `Proposal for: {{clientName}}
Prepared by: {{senderName}}, {{businessName}}
Services and pricing (as provided):
{{servicesAndPricing}}
Scope description:
{{scopeDescription}}
Terms notes: {{termsNotes}}`,
    inputSchema: JSON.stringify({
      type: "object",
      required: ["clientName", "servicesAndPricing", "scopeDescription"],
      properties: {
        clientName:        { type: "string", maxLength: 150 },
        businessName:      { type: "string", maxLength: 100 },
        servicesAndPricing:{ type: "string", minLength: 1, maxLength: 3000 },
        scopeDescription:  { type: "string", minLength: 1, maxLength: 2000 },
        termsNotes:        { type: "string", maxLength: 1000 },
      },
    }),
    outputFormat: '{ "proposalMarkdown": string, "scopeChecklist": string[], "termsChecklist": string[] }',
  },

  // ── 8. Prospect research and cold outreach ────────────────────────────────
  {
    slug: "prospect-research",
    name: "Prospect research and outreach drafts",
    description: "Input ICP and company names/URLs. Fetches public pages server-side, summarises each prospect, drafts a personalised outreach email. CAN-SPAM compliant note included.",
    verticalTags: ["salesrep", "professional"],
    minTier: "GUIDED",
    systemPrompt: `You research prospects and write personalised cold outreach emails for a salesperson.
Use only publicly available information from the provided HTML content.
Do not invent facts, quotes, or statistics.
Each outreach email must include: specific hook from their public info, clear value proposition, soft CTA.
CAN-SPAM compliance: physical address and unsubscribe note must be in the final email footer (remind the user to add these before sending).
${COMMON_RULES}
Output schema: { "prospects": [{ "name": string, "url": string, "summary": string, "outreachEmail": { "subject": string, "body": string } }], "complianceNote": string }`,
    userPromptTemplate: `My ICP (ideal customer profile):
{{icp}}

Sender: {{senderName}}, {{businessName}}

Prospects:
{{prospects}}`,
    inputSchema: JSON.stringify({
      type: "object",
      required: ["icp", "prospects"],
      properties: {
        icp:          { type: "string", minLength: 1, maxLength: 500 },
        businessName: { type: "string", maxLength: 100 },
        prospects:    { type: "string", minLength: 1, maxLength: 5000, description: "Company names and/or URLs, one per line" },
      },
    }),
    outputFormat: '{ "prospects": [{ name, url, summary, outreachEmail: { subject, body } }], "complianceNote": string }',
  },
];

export const PHASE3_SEEDS: WorkflowTemplateSeed[] = [
  // ── 9. Customer FAQ and support replies ───────────────────────────────────
  {
    slug: "faq-support",
    name: "Customer FAQ and support replies",
    description: "Build an FAQ knowledge base from client-provided text or URLs, then draft replies to customer questions using that knowledge. Low-confidence answers are flagged for human review.",
    verticalTags: [],
    minTier: "WHITE_GLOVE",
    systemPrompt: `You build a customer FAQ and draft support replies.
Task 1 (FAQ build): given source text, extract 5-15 common questions and plain-language answers.
Task 2 (reply draft): given a customer question and the FAQ, draft a short, warm reply. If the question isn't covered, flag it as low-confidence.
${COMMON_RULES}
Output schema: { "faqItems": [{ "question": string, "answer": string }], "replyDraft": string | null, "lowConfidence": boolean, "lowConfidenceReason": string | null }`,
    userPromptTemplate: `FAQ source text:
{{faqSource}}

Customer question: {{customerQuestion}}`,
    inputSchema: JSON.stringify({
      type: "object",
      required: ["faqSource"],
      properties: {
        faqSource:        { type: "string", minLength: 1, maxLength: 10000, description: "Business info, existing FAQ, service descriptions, or terms" },
        customerQuestion: { type: "string", maxLength: 500, description: "Optional: specific question to draft a reply for" },
      },
    }),
    outputFormat: '{ "faqItems": [{ question, answer }], "replyDraft": string|null, "lowConfidence": boolean, "lowConfidenceReason": string|null }',
  },

  // ── 10. Agent pipeline (multi-step) ──────────────────────────────────────
  {
    slug: "agent-pipeline",
    name: "Agent pipeline (multi-step)",
    description: "A configurable multi-step pipeline: each step runs one template, with its output feeding the next. Admin configures the chain per client. Client sees each step's output and approves the final result.",
    verticalTags: [],
    minTier: "WHITE_GLOVE",
    systemPrompt: `You run one step of a multi-step agent pipeline.
You receive the previous step's output as context and must produce the output for your assigned step.
${COMMON_RULES}
Return only the JSON for your step's assigned output schema.`,
    userPromptTemplate: `Step: {{stepName}}
Instructions for this step: {{stepInstructions}}
Previous step output:
{{previousOutput}}
Current input:
{{currentInput}}`,
    inputSchema: JSON.stringify({
      type: "object",
      required: ["stepName", "stepInstructions", "currentInput"],
      properties: {
        stepName:         { type: "string", maxLength: 100 },
        stepInstructions: { type: "string", maxLength: 2000 },
        previousOutput:   { type: "string", maxLength: 5000 },
        currentInput:     { type: "string", maxLength: 5000 },
      },
    }),
    outputFormat: '{ "stepOutput": string, "qualityFlags": string[], "readyForNextStep": boolean }',
  },
];
