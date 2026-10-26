/**
 * Deterministic day planner.
 * Turns a work window, declared accounts, and workflows into suggested blocks.
 * Nothing here reads a live inbox or calendar.
 */

export const DAY_BLOCK_KEYS = [
  "morning_email",
  "client_work",
  "followups",
  "admin",
  "deep_work",
  "lunch",
  "personal",
] as const;

export type DayBlockKey = (typeof DAY_BLOCK_KEYS)[number];

export type DayRealm = "professional" | "personal";
export type DayScope = "individual" | "team";
export type DaySource = "workflow" | "connection" | "consultation" | "action" | "intake";

export interface DayProfileInput {
  timezone: string;
  workDays: number[];
  startMin: number;
  endMin: number;
  typicalDay: DayBlockKey[];
  typicalNote: string | null;
  scope: DayScope;
  teamNote: string | null;
}

export interface DeclaredAccountInput {
  realm: DayRealm;
  kind: "email" | "calendar" | "other";
  provider: string;
  label: string;
}

export interface ConsultationSlot {
  id: string;
  title: string;
  startMin: number;
  durationMin: number;
}

export interface ActionSlot {
  id: string;
  text: string;
}

export interface SuggestionInput {
  profile: DayProfileInput;
  accounts: DeclaredAccountInput[];
  timeSinks: string[];
  areas: string[];
  personalizedSlugs: string[];
  automateFirst: string | null;
  consultations: ConsultationSlot[];
  actionItems: ActionSlot[];
  weekday: number;
}

export interface SuggestedBlock {
  suggestionKey: string;
  realm: DayRealm;
  title: string;
  detail: string;
  efficiency: string;
  skillSlug: string | null;
  startMin: number;
  endMin: number;
  source: DaySource;
}

interface Candidate {
  suggestionKey: string;
  realm: DayRealm;
  title: string;
  detail: string;
  efficiency: string;
  skillSlug: string | null;
  duration: number;
  source: DaySource;
  fixedStart?: number;
}

const BLOCK_KEYS = new Set<string>(DAY_BLOCK_KEYS);

export function isDayBlockKey(value: string): value is DayBlockKey {
  return BLOCK_KEYS.has(value);
}

export function zonedToday(timezone: string, now = new Date()): { date: string; weekday: number } {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(now);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { date, weekday: map[wd] ?? 0 };
}

export function zonedDateKey(timezone: string, instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function zonedMinutes(timezone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function isValidTimeZone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Build a profile from intake JSON. Returns null when the day questions were not answered. */
export function profileFromAnswers(answers: Record<string, unknown> | null): DayProfileInput | null {
  if (!answers) return null;
  if (typeof answers.timezone !== "string" || !isValidTimeZone(answers.timezone)) return null;
  if (!Array.isArray(answers.workDays) || answers.workDays.length === 0) return null;
  const workDays = answers.workDays.filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6);
  if (workDays.length === 0) return null;
  if (typeof answers.startMin !== "number" || typeof answers.endMin !== "number") return null;
  if (answers.endMin <= answers.startMin) return null;
  const typicalDay = Array.isArray(answers.typicalDay)
    ? answers.typicalDay.filter((k): k is DayBlockKey => typeof k === "string" && isDayBlockKey(k))
    : [];
  const bizSize = typeof answers.bizSize === "string" ? answers.bizSize : null;
  const scope: DayScope = bizSize === "2-10" && answers.dayScope === "team" ? "team" : "individual";
  const teamNote = scope === "team" && typeof answers.teamNote === "string" && answers.teamNote.trim()
    ? answers.teamNote.trim().slice(0, 200)
    : null;
  const typicalNote = typeof answers.typicalNote === "string" && answers.typicalNote.trim()
    ? answers.typicalNote.trim().slice(0, 280)
    : null;
  return {
    timezone: answers.timezone,
    workDays,
    startMin: answers.startMin,
    endMin: answers.endMin,
    typicalDay,
    typicalNote,
    scope,
    teamNote,
  };
}

export function reconcileDayBlocks(
  existing: { suggestionKey: string; status: string }[],
  suggested: SuggestedBlock[],
): { create: SuggestedBlock[]; update: SuggestedBlock[]; removeKeys: string[] } {
  const byKey = new Map(existing.map((row) => [row.suggestionKey, row.status]));
  const create: SuggestedBlock[] = [];
  const update: SuggestedBlock[] = [];
  for (const block of suggested) {
    const status = byKey.get(block.suggestionKey);
    if (!status) create.push(block);
    else if (status === "suggested") update.push(block);
  }
  const suggestedKeys = new Set(suggested.map((block) => block.suggestionKey));
  const removeKeys = existing
    .filter((row) => row.status === "suggested" && !suggestedKeys.has(row.suggestionKey))
    .map((row) => row.suggestionKey);
  return { create, update, removeKeys };
}

function has(list: string[], value: string): boolean {
  return list.includes(value);
}

function skill(slugs: string[], slug: string): string | null {
  return slugs.includes(slug) ? slug : null;
}

export function suggestDay(input: SuggestionInput): SuggestedBlock[] {
  const { profile, accounts, timeSinks, personalizedSlugs, automateFirst, consultations, actionItems, weekday } = input;
  const isWorkDay = profile.workDays.includes(weekday);
  const typical = new Set(profile.typicalDay);
  const proEmail = accounts.some((a) => a.realm === "professional" && a.kind === "email");
  const proCalendar = accounts.some((a) => a.realm === "professional" && a.kind === "calendar");
  const personalAccount = accounts.some((a) => a.realm === "personal");

  const catalog = new Map<string, Candidate>();

  const wantInbox = typical.has("morning_email") || has(timeSinks, "email") || proEmail || has(personalizedSlugs, "inbox-triage") || has(input.areas, "executive_assistant");
  if (isWorkDay && wantInbox) {
    catalog.set("morning_email", {
      suggestionKey: "morning_email",
      realm: "professional",
      title: proEmail ? "Clear work inbox" : "Clear the inbox",
      detail: proEmail
        ? "Your work email stays in this block. Personal mail is a separate pass."
        : "One pass through work email before the rest of the day.",
      efficiency: "Batch it once, before client work.",
      skillSlug: "inbox-triage",
      duration: 25,
      source: proEmail ? "connection" : "workflow",
    });
  }

  if (isWorkDay && actionItems.length > 0) {
    const texts = actionItems.map((item) => item.text.trim()).filter(Boolean);
    catalog.set("actions_due", {
      suggestionKey: "actions_due",
      realm: "professional",
      title: texts.length === 1 ? texts[0]!.slice(0, 80) : `${texts.length} items due`,
      detail: texts.join(" · ").slice(0, 400),
      efficiency: "Clear these before they slide into tomorrow.",
      skillSlug: null,
      duration: 15,
      source: "action",
    });
  }

  const wantFollow = typical.has("followups") || has(timeSinks, "followups") || has(personalizedSlugs, "follow-up");
  if (isWorkDay && wantFollow) {
    catalog.set("followups", {
      suggestionKey: "followups",
      realm: "professional",
      title: "Clear follow-ups",
      detail: "This block is reserved so follow-ups happen once, after inbox and before the rest of the day. You don't fill in who, what happened, or what to say.",
      efficiency: "Do this right after inbox so the context stays in one pass.",
      skillSlug: null,
      duration: 25,
      source: "workflow",
    });
  }

  if (isWorkDay && typical.has("client_work")) {
    catalog.set("client_work", {
      suggestionKey: "client_work",
      realm: "professional",
      title: "Client and job work",
      detail: "The part of the day that is the actual work.",
      efficiency: "Protect this block. Don't split it with email.",
      skillSlug: null,
      duration: 90,
      source: "intake",
    });
  }

  if (isWorkDay && (typical.has("admin") || has(timeSinks, "admin") || has(personalizedSlugs, "money-snapshot"))) {
    catalog.set("admin", {
      suggestionKey: "admin",
      realm: "professional",
      title: "Admin and bookkeeping",
      detail: "Numbers, paperwork, and the admin that piles up when it is scattered.",
      efficiency: "One admin pass beats checking numbers all day.",
      skillSlug: skill(personalizedSlugs, "money-snapshot"),
      duration: 30,
      source: "workflow",
    });
  }

  if (isWorkDay && typical.has("deep_work")) {
    catalog.set("deep_work", {
      suggestionKey: "deep_work",
      realm: "professional",
      title: "Deep work",
      detail: "Uninterrupted time for the work that needs a clear head.",
      efficiency: "Put this before the day fills with replies.",
      skillSlug: null,
      duration: 75,
      source: "intake",
    });
  }

  if (isWorkDay && typical.has("lunch")) {
    catalog.set("lunch", {
      suggestionKey: "lunch",
      realm: "professional",
      title: "Lunch",
      detail: "A break in the workday.",
      efficiency: "A real break. Leave the inbox closed.",
      skillSlug: null,
      duration: 45,
      source: "intake",
    });
  }

  if (isWorkDay && (has(timeSinks, "scheduling") || proCalendar || has(personalizedSlugs, "booking-flow"))) {
    catalog.set("calendar", {
      suggestionKey: "calendar",
      realm: "professional",
      title: "Review the work calendar",
      detail: proCalendar
        ? "Your work calendar, kept apart from the personal one. Confirm tomorrow before the day fills itself."
        : "Look ahead one day and confirm what is already booked.",
      efficiency: "A short look now saves a broken afternoon.",
      skillSlug: skill(personalizedSlugs, "booking-flow"),
      duration: 15,
      source: proCalendar ? "connection" : "workflow",
    });
  }

  if (isWorkDay && (has(timeSinks, "social_content") || has(personalizedSlugs, "social-calendar"))) {
    catalog.set("social", {
      suggestionKey: "social",
      realm: "professional",
      title: "Draft the next posts",
      detail: "Batch the content instead of writing one post at a time.",
      efficiency: "Batch the week's posts in one sitting.",
      skillSlug: "social-calendar",
      duration: 40,
      source: "workflow",
    });
  }

  if (isWorkDay && (has(timeSinks, "prospecting") || has(personalizedSlugs, "prospect-research"))) {
    catalog.set("prospecting", {
      suggestionKey: "prospecting",
      realm: "professional",
      title: "Prospect research",
      detail: "Find the next people to talk to, in one sitting.",
      efficiency: "Research once, then stop. Don't sprinkle it through the day.",
      skillSlug: "prospect-research",
      duration: 40,
      source: "workflow",
    });
  }

  if (isWorkDay && (has(timeSinks, "proposals") || has(personalizedSlugs, "quote-proposal"))) {
    catalog.set("proposals", {
      suggestionKey: "proposals",
      realm: "professional",
      title: "Quotes and proposals",
      detail: "Write the quotes that are waiting, then leave them.",
      efficiency: "Quotes go faster when they aren't squeezed between calls.",
      skillSlug: skill(personalizedSlugs, "quote-proposal"),
      duration: 40,
      source: "workflow",
    });
  }

  if (isWorkDay && has(timeSinks, "research") && !catalog.has("prospecting")) {
    catalog.set("research", {
      suggestionKey: "research",
      realm: "professional",
      title: "Research block",
      detail: "One block for looking things up, instead of tab-hopping all day.",
      efficiency: "Park questions here instead of chasing them as they appear.",
      skillSlug: skill(personalizedSlugs, "prospect-research"),
      duration: 40,
      source: "workflow",
    });
  }

  if (isWorkDay && has(personalizedSlugs, "review-request")) {
    catalog.set("reviews", {
      suggestionKey: "reviews",
      realm: "professional",
      title: "Ask for reviews",
      detail: "Request reviews from recent customers in one pass.",
      efficiency: "A short list, sent together, beats remembering one at a time.",
      skillSlug: "review-request",
      duration: 20,
      source: "workflow",
    });
  }

  if (isWorkDay && has(personalizedSlugs, "seo-audit")) {
    catalog.set("seo", {
      suggestionKey: "seo",
      realm: "professional",
      title: "Check the site",
      detail: "A short look at the page people actually find you on.",
      efficiency: "Do this weekly, not every time you think of it.",
      skillSlug: "seo-audit",
      duration: 25,
      source: "workflow",
    });
  }

  if (isWorkDay && has(personalizedSlugs, "faq-support")) {
    catalog.set("support", {
      suggestionKey: "support",
      realm: "professional",
      title: "Support replies",
      detail: "Answer the questions that are waiting.",
      efficiency: "Reply in a batch so the same answer isn't rewritten all day.",
      skillSlug: "faq-support",
      duration: 30,
      source: "workflow",
    });
  }

  if (isWorkDay && automateFirst && automateFirst.trim()) {
    const text = automateFirst.trim().slice(0, 120);
    catalog.set("automate_first", {
      suggestionKey: "automate_first",
      realm: "professional",
      title: text,
      detail: "The one task you asked to have handled.",
      efficiency: "Give it a slot or it will stay on the list.",
      skillSlug: null,
      duration: 40,
      source: "intake",
    });
  }

  const after: Candidate[] = [];
  const wantPersonal = typical.has("personal") || has(timeSinks, "personal_logistics") || personalAccount;
  if (wantPersonal) {
    after.push({
      suggestionKey: "personal",
      realm: "personal",
      title: personalAccount ? "Personal inbox and family logistics" : "Personal and family logistics",
      detail: "Kept off the work day so personal mail and family logistics don't split client work.",
      efficiency: "One personal pass after you stop work. Don't mix it into the work inbox.",
      skillSlug: null,
      duration: 30,
      source: personalAccount ? "connection" : "intake",
    });
  }

  const order = [
    "morning_email",
    "actions_due",
    "followups",
    "calendar",
    ...profile.typicalDay.filter((key) => key !== "personal" && key !== "morning_email" && key !== "followups"),
    "client_work",
    "deep_work",
    "admin",
    "social",
    "prospecting",
    "proposals",
    "research",
    "reviews",
    "seo",
    "support",
    "lunch",
    "automate_first",
  ];
  const work: Candidate[] = [];
  const seen = new Set<string>();
  for (const key of order) {
    const candidate = catalog.get(key);
    if (!candidate || seen.has(key)) continue;
    seen.add(key);
    work.push(candidate);
  }

  const fixed: Candidate[] = consultations.map((item) => ({
    suggestionKey: `consultation:${item.id}`,
    realm: "professional" as const,
    title: item.title,
    detail: "Already on your calendar. The rest of the day moves around it.",
    efficiency: "Leave the slot clear. Don't book work over it.",
    skillSlug: null,
    duration: Math.max(15, item.durationMin),
    source: "consultation" as const,
    fixedStart: item.startMin,
  }));

  const placedFixed = fixed.map((item) => ({
    suggestionKey: item.suggestionKey,
    realm: item.realm,
    title: item.title,
    detail: item.detail,
    efficiency: item.efficiency,
    skillSlug: item.skillSlug,
    startMin: item.fixedStart ?? profile.startMin,
    endMin: (item.fixedStart ?? profile.startMin) + item.duration,
    source: item.source,
  }));

  const obstacles = placedFixed
    .map((item) => ({ start: item.startMin, end: item.endMin }))
    .sort((a, b) => a.start - b.start);

  const placedWork: SuggestedBlock[] = [];
  if (isWorkDay) {
    let cursor = profile.startMin;
    for (const candidate of work) {
      let guard = 0;
      while (guard < 20) {
        const hit = obstacles.find((slot) => cursor < slot.end && cursor + Math.min(candidate.duration, profile.endMin - cursor) > slot.start);
        if (!hit) break;
        cursor = Math.max(cursor, hit.end);
        guard += 1;
      }
      if (cursor + 10 > profile.endMin) break;
      const duration = Math.min(candidate.duration, profile.endMin - cursor);
      if (duration < 10) break;
      placedWork.push({
        suggestionKey: candidate.suggestionKey,
        realm: candidate.realm,
        title: candidate.title,
        detail: candidate.detail,
        efficiency: candidate.efficiency,
        skillSlug: candidate.skillSlug,
        startMin: cursor,
        endMin: cursor + duration,
        source: candidate.source,
      });
      cursor += duration;
    }
  }

  let afterCursor = isWorkDay ? profile.endMin : profile.startMin;
  const placedAfter: SuggestedBlock[] = [];
  for (const candidate of after) {
    let guard = 0;
    while (guard < 20) {
      const hit = obstacles.find((slot) => afterCursor < slot.end && afterCursor + candidate.duration > slot.start);
      if (!hit) break;
      afterCursor = Math.max(afterCursor, hit.end);
      guard += 1;
    }
    placedAfter.push({
      suggestionKey: candidate.suggestionKey,
      realm: candidate.realm,
      title: candidate.title,
      detail: candidate.detail,
      efficiency: candidate.efficiency,
      skillSlug: candidate.skillSlug,
      startMin: afterCursor,
      endMin: afterCursor + candidate.duration,
      source: candidate.source,
    });
    afterCursor += candidate.duration;
  }

  return [...placedFixed, ...placedWork, ...placedAfter].sort((a, b) => a.startMin - b.startMin || a.title.localeCompare(b.title));
}
