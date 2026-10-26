/**
 * Day dashboard.
 * GET  /api/day                 — today's plan, accounts, and reminders
 * PUT  /api/day/profile         — save work hours and typical day
 * POST /api/day/accounts        — declare an email, calendar, or other account
 * DELETE /api/day/accounts/:id  — remove a declared account
 * PATCH /api/day/blocks/:id     — add to the day, mark done, or dismiss
 *
 * Accounts are declared only. Nothing here connects to a live inbox or calendar.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, type AuthedRequest } from "../lib/auth";
import { sanitiseShortText, sanitiseText } from "../lib/sanitize";
import { extractPersonalizedSlugs } from "../lib/personalization";
import { parseIntakeAnswers, toProfileData } from "../lib/dayProfile";
import {
  DAY_BLOCK_KEYS,
  isValidTimeZone,
  profileFromAnswers,
  reconcileDayBlocks,
  suggestDay,
  zonedDateKey,
  zonedMinutes,
  zonedToday,
  type DayBlockKey,
  type DayProfileInput,
} from "../lib/dayPlan";

const router = Router();
router.use(withUser, requireAuth);

function clientId(req: AuthedRequest, res: { status: (code: number) => { json: (body: unknown) => void } }): string | null {
  const id = req.atgUser?.clientId;
  if (!id) {
    res.status(404).json({ error: "No client profile. Complete the intake first." });
    return null;
  }
  return id;
}

function readJsonArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readList(raw: string | null | undefined): string[] {
  return readJsonArray(raw).filter((item): item is string => typeof item === "string");
}

function readNumbers(raw: string | null | undefined): number[] {
  return readJsonArray(raw)
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isInteger(item));
}

function readProfile(row: {
  timezone: string;
  workDays: string;
  startMin: number;
  endMin: number;
  typicalDay: string;
  typicalNote: string | null;
  scope: string;
  teamNote: string | null;
}): DayProfileInput {
  const workDays = readNumbers(row.workDays).filter((day) => day >= 0 && day <= 6);
  const typicalDay = readList(row.typicalDay).filter((key): key is DayBlockKey =>
    (DAY_BLOCK_KEYS as readonly string[]).includes(key),
  );
  return {
    timezone: row.timezone,
    workDays: workDays.length > 0 ? workDays : [1, 2, 3, 4, 5],
    startMin: row.startMin,
    endMin: row.endMin,
    typicalDay,
    typicalNote: row.typicalNote,
    scope: row.scope === "team" ? "team" : "individual",
    teamNote: row.teamNote,
  };
}

const ProfileBody = z.object({
  timezone: z.string().min(1).max(64),
  workDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  startMin: z.number().int().min(0).max(24 * 60),
  endMin: z.number().int().min(0).max(24 * 60),
  typicalDay: z.array(z.enum(DAY_BLOCK_KEYS)).min(1).max(7),
  typicalNote: z.string().max(280).optional(),
  dayScope: z.enum(["individual", "team"]).optional(),
  teamNote: z.string().max(200).optional(),
});

const AccountBody = z.object({
  realm: z.enum(["professional", "personal"]),
  kind: z.enum(["email", "calendar", "other"]),
  provider: z.enum(["gmail", "outlook", "apple", "other"]),
  label: z.string().min(1).max(80),
});

const BlockAction = z.object({
  action: z.enum(["schedule", "done", "dismiss"]),
});

router.get("/day", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;

  const client = await prisma.client.findUnique({
    where: { id: cid },
    include: {
      dayProfile: true,
      declaredAccounts: { orderBy: { createdAt: "asc" } },
      intakes: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!client) {
    res.status(404).json({ error: "No client profile. Complete the intake first." });
    return;
  }

  const answers = parseIntakeAnswers(client.intakes[0]?.answers);
  const bizSize = (typeof answers?.bizSize === "string" ? answers.bizSize : null) ?? client.size;
  const timezone = client.dayProfile && isValidTimeZone(client.dayProfile.timezone)
    ? client.dayProfile.timezone
    : "America/Denver";
  const today = zonedToday(timezone);
  const profile = client.dayProfile ? readProfile(client.dayProfile) : null;

  const [consultations, actionItems, drafts] = await Promise.all([
    prisma.consultation.findMany({
      where: { clientId: cid, status: { not: "CANCELLED" }, scheduledAt: { not: null } },
    }),
    prisma.actionItem.findMany({
      where: { done: false, owner: "CLIENT", dueAt: { not: null }, consultation: { clientId: cid } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.outputItem.findMany({
      where: { clientId: cid, status: "pending" },
      include: { workflow: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const todayConsultations = consultations.filter((item) =>
    item.scheduledAt ? zonedDateKey(timezone, item.scheduledAt) === today.date : false,
  );
  const dueActions = actionItems.filter((item) =>
    item.dueAt ? zonedDateKey(timezone, item.dueAt) <= today.date : false,
  );

  let blocks: {
    id: string;
    suggestionKey: string;
    realm: string;
    title: string;
    detail: string;
    efficiency: string;
    skillSlug: string | null;
    startMin: number;
    endMin: number;
    status: string;
    source: string;
  }[] = [];

  if (profile) {
    const suggested = suggestDay({
      profile,
      accounts: client.declaredAccounts.map((account) => ({
        realm: account.realm === "personal" ? "personal" : "professional",
        kind: account.kind === "calendar" || account.kind === "other" ? account.kind : "email",
        provider: account.provider,
        label: account.label,
      })),
      timeSinks: Array.isArray(answers?.timeSinks) ? answers.timeSinks.filter((item): item is string => typeof item === "string") : [],
      areas: readList(client.areas),
      personalizedSlugs: extractPersonalizedSlugs(client.notes) ?? [],
      automateFirst: typeof answers?.automateFirst === "string" ? answers.automateFirst : null,
      consultations: todayConsultations.map((item) => ({
        id: item.id,
        title: item.title,
        startMin: item.scheduledAt ? zonedMinutes(timezone, item.scheduledAt) : profile.startMin,
        durationMin: item.durationMin,
      })),
      actionItems: dueActions.map((item) => ({ id: item.id, text: item.text })),
      weekday: today.weekday,
    });

    const existing = await prisma.dayBlock.findMany({ where: { clientId: cid, date: today.date } });
    const plan = reconcileDayBlocks(existing, suggested);
    if (plan.removeKeys.length > 0) {
      await prisma.dayBlock.deleteMany({
        where: { clientId: cid, date: today.date, suggestionKey: { in: plan.removeKeys }, status: "suggested" },
      });
    }
    for (const block of plan.update) {
      await prisma.dayBlock.updateMany({
        where: { clientId: cid, date: today.date, suggestionKey: block.suggestionKey, status: "suggested" },
        data: {
          realm: block.realm,
          title: block.title,
          detail: block.detail,
          efficiency: block.efficiency,
          skillSlug: block.skillSlug,
          startMin: block.startMin,
          endMin: block.endMin,
          source: block.source,
        },
      });
    }
    if (plan.create.length > 0) {
      await prisma.dayBlock.createMany({
        data: plan.create.map((block) => ({
          clientId: cid,
          date: today.date,
          suggestionKey: block.suggestionKey,
          realm: block.realm,
          title: block.title,
          detail: block.detail,
          efficiency: block.efficiency,
          skillSlug: block.skillSlug,
          startMin: block.startMin,
          endMin: block.endMin,
          status: "suggested",
          source: block.source,
        })),
      });
    }
    blocks = await prisma.dayBlock.findMany({
      where: { clientId: cid, date: today.date, status: { not: "dismissed" } },
      orderBy: { startMin: "asc" },
    });
  }

  res.json({
    profile: profile && client.dayProfile
      ? {
          timezone: profile.timezone,
          workDays: profile.workDays,
          startMin: profile.startMin,
          endMin: profile.endMin,
          typicalDay: profile.typicalDay,
          typicalNote: profile.typicalNote,
          scope: profile.scope,
          teamNote: profile.teamNote,
        }
      : null,
    bizSize,
    accounts: client.declaredAccounts.map((account) => ({
      id: account.id,
      realm: account.realm,
      kind: account.kind,
      provider: account.provider,
      label: account.label,
    })),
    date: today.date,
    weekday: today.weekday,
    isWorkDay: profile ? profile.workDays.includes(today.weekday) : true,
    blocks,
    reminders: {
      consultations: todayConsultations.map((item) => ({
        id: item.id,
        title: item.title,
        scheduledAt: item.scheduledAt,
        durationMin: item.durationMin,
      })),
      actionItems: dueActions.map((item) => ({
        id: item.id,
        text: item.text,
        dueAt: item.dueAt,
      })),
      drafts: drafts.map((item) => ({
        id: item.id,
        type: item.type,
        subject: item.subject,
        content: item.content,
        status: item.status,
        workflowName: item.workflow.name,
      })),
    },
  });
});

router.put("/day/profile", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = ProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Check the work days, hours, and typical day." });
    return;
  }
  if (!isValidTimeZone(parsed.data.timezone)) {
    res.status(422).json({ error: "Pick a valid timezone." });
    return;
  }
  if (parsed.data.endMin <= parsed.data.startMin) {
    res.status(422).json({ error: "Work needs to end after it starts." });
    return;
  }

  const client = await prisma.client.findUnique({
    where: { id: cid },
    include: { intakes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!client) {
    res.status(404).json({ error: "No client profile. Complete the intake first." });
    return;
  }
  const answers = parseIntakeAnswers(client.intakes[0]?.answers);
  const bizSize = (typeof answers?.bizSize === "string" ? answers.bizSize : null) ?? client.size;
  const profile = profileFromAnswers({
    timezone: parsed.data.timezone,
    workDays: parsed.data.workDays,
    startMin: parsed.data.startMin,
    endMin: parsed.data.endMin,
    typicalDay: parsed.data.typicalDay,
    typicalNote: parsed.data.typicalNote ? sanitiseText(parsed.data.typicalNote, 280) : "",
    dayScope: parsed.data.dayScope,
    teamNote: parsed.data.teamNote ? sanitiseText(parsed.data.teamNote, 200) : "",
    bizSize,
  });
  if (!profile) {
    res.status(422).json({ error: "Check the work days, hours, and typical day." });
    return;
  }

  const saved = await prisma.dayProfile.upsert({
    where: { clientId: cid },
    create: { clientId: cid, ...toProfileData(profile) },
    update: toProfileData(profile),
  });
  res.json({
    timezone: saved.timezone,
    workDays: profile.workDays,
    startMin: saved.startMin,
    endMin: saved.endMin,
    typicalDay: profile.typicalDay,
    typicalNote: saved.typicalNote,
    scope: saved.scope,
    teamNote: saved.teamNote,
  });
});

router.post("/day/accounts", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = AccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Choose a work or personal account, then name it." });
    return;
  }
  const account = await prisma.declaredAccount.create({
    data: {
      clientId: cid,
      realm: parsed.data.realm,
      kind: parsed.data.kind,
      provider: parsed.data.provider,
      label: sanitiseShortText(parsed.data.label).slice(0, 80),
    },
  });
  res.status(201).json({
    id: account.id,
    realm: account.realm,
    kind: account.kind,
    provider: account.provider,
    label: account.label,
  });
});

router.delete("/day/accounts/:id", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const account = await prisma.declaredAccount.findFirst({
    where: { id: req.params.id as string, clientId: cid },
  });
  if (!account) {
    res.status(404).json({ error: "Account not found." });
    return;
  }
  await prisma.declaredAccount.delete({ where: { id: account.id } });
  res.json({ ok: true });
});

router.patch("/day/blocks/:id", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = BlockAction.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Invalid action." });
    return;
  }
  const block = await prisma.dayBlock.findFirst({
    where: { id: req.params.id as string, clientId: cid },
  });
  if (!block) {
    res.status(404).json({ error: "Block not found." });
    return;
  }
  const status = parsed.data.action === "schedule" ? "scheduled" : parsed.data.action === "done" ? "done" : "dismissed";
  const updated = await prisma.dayBlock.update({ where: { id: block.id }, data: { status } });
  res.json(updated);
});

export default router;
