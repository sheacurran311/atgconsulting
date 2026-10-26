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

const COMMON_RULES = `
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
export function renderSkillMd(t: {
  slug: string; name: string; description: string;
  minTier: string; verticalTags: string; systemPrompt: string;
  userPromptTemplate: string; inputSchema: string; outputFormat: string;
}): string {
  const tags: string[] = (() => { try { return JSON.parse(t.verticalTags) as string[]; } catch { return []; } })();
  return [
    `---`,
    `name: ${t.name}`,
    `slug: ${t.slug}`,
    `tier: ${t.minTier}`,
    `verticals: ${tags.length ? tags.join(", ") : "all"}`,
    `---`,
    ``,
    `# ${t.name}`,
    ``,
    t.description,
    ``,
    `## How to use in Grok Bot / Claude / ChatGPT`,
    ``,
    `1. Copy the **System Prompt** section below and paste it as your assistant's system instructions.`,
    `2. Fill in the variables in the **User Prompt** template and send it as your message.`,
    `3. Review the output before using it — nothing is sent automatically.`,
    ``,
    `## System Prompt`,
    ``,
    "```",
    t.systemPrompt,
    "```",
    ``,
    `## User Prompt Template`,
    ``,
    `Replace each \`{{variable}}\` with your own content.`,
    ``,
    "```",
    t.userPromptTemplate,
    "```",
    ``,
    `## Input Schema`,
    ``,
    "```json",
    JSON.stringify(JSON.parse(t.inputSchema), null, 2),
    "```",
    ``,
    `## Expected Output Format`,
    ``,
    "```",
    t.outputFormat,
    "```",
    ``,
    `---`,
    `*Generated by ATG Consulting — atgconsulting.io*`,
  ].join("\n");
}
