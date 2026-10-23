/**
 * Verticals content config — edit this file to update the 'Who we help' section,
 * hero demo, intake form, and output gallery.
 * One entry per business type. Each vertical has up to 4 workflows.
 */

export type AreaKey = "ea" | "marketing" | "sales" | "cs";

export interface VerticalWorkflow {
  /** Plain-English name, no jargon. Keep under ~6 words. */
  name: string;
  /** One sentence describing what it actually does. 8th-grade level. */
  what: string;
  area: AreaKey;
  /** Output type — used for gallery cards and intake suggestions. */
  outputType: "briefing" | "email_draft" | "lead_list" | "social_post" | "quote_followup" | "review_request";
  /** Conservative estimate of hours saved per week (used in calculator). */
  hoursPerWeek: [number, number]; // [min, max]
}

export interface Vertical {
  id: string;
  label: string;
  /** Short tagline shown in selector. */
  tagline: string;
  workflows: VerticalWorkflow[];
}

export const VERTICALS: Vertical[] = [
  {
    id: "trades",
    label: "Home services & trades",
    tagline: "Plumbers, electricians, roofers, landscapers, cleaners",
    workflows: [
      { name: "Missed calls become booked jobs", what: "Every missed call gets a same-day text with a booking link, automatically.", area: "cs", outputType: "email_draft", hoursPerWeek: [2, 5] },
      { name: "Quotes go out same day", what: "After a site visit, your estimate email is drafted and ready to send in minutes.", area: "sales", outputType: "quote_followup", hoursPerWeek: [1, 3] },
      { name: "Reviews requested automatically", what: "Every completed job triggers a short, friendly request for a Google review.", area: "cs", outputType: "review_request", hoursPerWeek: [1, 2] },
    ],
  },
  {
    id: "realestate",
    label: "Real estate",
    tagline: "Agents, brokers, and property managers",
    workflows: [
      { name: "New listings sent to your sphere", what: "Every new listing automatically goes out as a personalised note to your contacts.", area: "marketing", outputType: "email_draft", hoursPerWeek: [2, 4] },
      { name: "Follow-ups never slip", what: "Every lead gets a follow-up draft at the right time, logged to your CRM.", area: "sales", outputType: "email_draft", hoursPerWeek: [3, 6] },
      { name: "Market updates written for you", what: "A monthly market update email, drafted in your voice, ready to review and send.", area: "marketing", outputType: "social_post", hoursPerWeek: [1, 3] },
    ],
  },
  {
    id: "hospitality",
    label: "Restaurants, breweries & local retail",
    tagline: "Food, drink, and local shop owners",
    workflows: [
      { name: "Events drafted and posted automatically", what: "Upcoming events turned into posts for your social channels and email list.", area: "marketing", outputType: "social_post", hoursPerWeek: [2, 4] },
      { name: "Review responses ready to send", what: "Every new review gets a warm, personal response draft waiting in your inbox.", area: "cs", outputType: "review_request", hoursPerWeek: [1, 3] },
      { name: "Weekly highlights written for you", what: "Your best moments from the week turned into a short email or social recap.", area: "marketing", outputType: "briefing", hoursPerWeek: [1, 2] },
    ],
  },
  {
    id: "professional",
    label: "Professional services",
    tagline: "Accounting, legal, insurance, and agencies",
    workflows: [
      { name: "Client emails answered in your voice", what: "Routine client questions get a draft response waiting for your one-click review.", area: "cs", outputType: "email_draft", hoursPerWeek: [3, 7] },
      { name: "Proposals drafted from your template", what: "After a discovery call, a personalised proposal is drafted and ready to send.", area: "sales", outputType: "quote_followup", hoursPerWeek: [2, 5] },
      { name: "Deadlines tracked and flagged", what: "A morning briefing surfaces upcoming deadlines, overdue items, and next steps.", area: "ea", outputType: "briefing", hoursPerWeek: [1, 3] },
    ],
  },
  {
    id: "salesrep",
    label: "Independent sales reps",
    tagline: "Commission reps and 1099 salespeople",
    workflows: [
      { name: "Prospect lists built automatically", what: "A fresh list of new accounts in your territory lands in your inbox every week.", area: "sales", outputType: "lead_list", hoursPerWeek: [3, 6] },
      { name: "Follow-up drafts always ready", what: "Every open deal gets a follow-up email ready to review the next morning.", area: "sales", outputType: "email_draft", hoursPerWeek: [2, 5] },
      { name: "Activity logged without data entry", what: "Every email sent or received is logged to your CRM with a summary.", area: "ea", outputType: "briefing", hoursPerWeek: [1, 3] },
    ],
  },
  {
    id: "solo",
    label: "Coaches, creators & solo pros",
    tagline: "Coaches, consultants, freelancers, and content creators",
    workflows: [
      { name: "One piece becomes a week of content", what: "A blog post, podcast, or video is automatically turned into posts, emails, and clips.", area: "marketing", outputType: "social_post", hoursPerWeek: [3, 6] },
      { name: "Leads from your audience nurtured", what: "Every new subscriber or inquiry gets a warm, personal follow-up sequence.", area: "sales", outputType: "email_draft", hoursPerWeek: [2, 4] },
      { name: "Client notes organised after sessions", what: "Session recordings turned into clean notes and action items for your client file.", area: "ea", outputType: "briefing", hoursPerWeek: [1, 3] },
    ],
  },
];

export const VERTICAL_MAP: Record<string, Vertical> = Object.fromEntries(
  VERTICALS.map((v) => [v.id, v]),
);

/** Map area key to a human-readable label */
export const AREA_LABELS_SIMPLE: Record<AreaKey, string> = {
  ea:        "Admin & ops",
  marketing: "Marketing",
  sales:     "Sales",
  cs:        "Customer replies",
};
