/**
 * Self-guided AI Workshop.
 * Clients run exercises in their own assistant. Nothing here connects to those accounts.
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest, type ATGUser } from "../lib/auth";
import { testModeForActor } from "../lib/access";
import { canAccessWorkshop, parseQuiz, parseTakeaways, progressPercent, scoreQuiz } from "../lib/workshopAccess";

const router = Router();

async function workshopActor(user: ATGUser): Promise<{ tier: string; progressUserId: string; testMode: boolean }> {
  const client = user.clientId
    ? await prisma.client.findUnique({ where: { id: user.clientId }, select: { tier: true, userId: true } })
    : await prisma.client.findUnique({ where: { userId: user.id }, select: { tier: true, userId: true } });
  return {
    tier: client?.tier ?? "NONE",
    progressUserId: client?.userId ?? user.id,
    testMode: testModeForActor(user.role),
  };
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function publishedLessonWhere() {
  return { status: "PUBLISHED", module: { status: "PUBLISHED" } } as const;
}

function missingWorkshopTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Workshop(Module|Lesson|Progress|Quiz)|does not exist|P2021/i.test(msg);
}

export async function workshopSummary(userId: string, tier: string, testMode = false) {
  const locked = !canAccessWorkshop(tier, testMode);
  if (locked) {
    return {
      locked: true,
      percent: 0,
      completedLessons: 0,
      totalLessons: 0,
      resumeLabel: null as string | null,
      resumeHref: null as string | null,
    };
  }
  let lessons: { id: string; slug: string; title: string }[] = [];
  try {
    lessons = await prisma.workshopLesson.findMany({
      where: publishedLessonWhere(),
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
      select: { id: true, slug: true, title: true },
    });
  } catch (err) {
    if (!missingWorkshopTable(err)) throw err;
    return { locked: false, percent: 0, completedLessons: 0, totalLessons: 0, resumeLabel: null, resumeHref: null };
  }
  const done = lessons.length
    ? await prisma.workshopProgress.findMany({
        where: { userId, lessonId: { in: lessons.map((lesson) => lesson.id) } },
        select: { lessonId: true },
      })
    : [];
  const doneIds = new Set(done.map((row) => row.lessonId));
  const resume = lessons.find((lesson) => !doneIds.has(lesson.id)) ?? null;
  return {
    locked: false,
    percent: progressPercent(doneIds.size, lessons.length),
    completedLessons: doneIds.size,
    totalLessons: lessons.length,
    resumeLabel: resume?.title ?? (lessons.length ? "Workshop complete" : null),
    resumeHref: resume ? `/app/learn/workshop/${resume.slug}` : (lessons.length ? "/app/learn/workshop" : null),
  };
}

router.get("/workshop", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const actor = await workshopActor(user);
  const tier = actor.tier;
  const locked = !canAccessWorkshop(tier, actor.testMode);
  const modules = await prisma.workshopModule.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
    include: {
      lessons: {
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
        select: { id: true, slug: true, title: true, minutes: true, order: true },
      },
    },
  });
  const lessonIds = modules.flatMap((mod) => mod.lessons.map((lesson) => lesson.id));
  const [progress, quizzes] = locked || !lessonIds.length
    ? [[], []]
    : await Promise.all([
        prisma.workshopProgress.findMany({ where: { userId: actor.progressUserId, lessonId: { in: lessonIds } }, select: { lessonId: true } }),
        prisma.workshopQuizResult.findMany({ where: { userId: actor.progressUserId, moduleId: { in: modules.map((mod) => mod.id) } }, select: { moduleId: true, score: true, total: true } }),
      ]);
  const done = new Set(progress.map((row) => row.lessonId));
  const quizByModule = new Map(quizzes.map((row) => [row.moduleId, row]));
  const flat = modules.flatMap((mod) => mod.lessons);
  const summary = {
    locked,
    percent: locked ? 0 : progressPercent(done.size, flat.length),
    completedLessons: locked ? 0 : done.size,
    totalLessons: flat.length,
  };
  res.json({
    ...summary,
    testMode: actor.testMode,
    modules: modules.map((mod) => {
      const completedInModule = mod.lessons.filter((lesson) => done.has(lesson.id)).length;
      const quiz = quizByModule.get(mod.id);
      return {
        slug: mod.slug,
        title: mod.title,
        summary: locked ? "" : mod.summary,
        order: mod.order,
        percent: locked ? 0 : progressPercent(completedInModule, mod.lessons.length),
        lessonCount: mod.lessons.length,
        completedLessons: locked ? 0 : completedInModule,
        quiz: quiz ? { score: quiz.score, total: quiz.total } : null,
        hasQuiz: !locked && parseQuiz(mod.quizJson).length > 0,
        lessons: mod.lessons.map((lesson) => ({
          slug: lesson.slug,
          title: lesson.title,
          minutes: lesson.minutes,
          completed: !locked && done.has(lesson.id),
        })),
      };
    }),
  });
});

router.get("/workshop/lessons/:slug", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const actor = await workshopActor(user);
  const tier = actor.tier;
  if (!canAccessWorkshop(tier, actor.testMode)) {
    res.status(403).json({ error: "Upgrade your plan to open the AI Workshop." });
    return;
  }
  const lesson = await prisma.workshopLesson.findFirst({
    where: { slug: one(req.params.slug), ...publishedLessonWhere() },
    include: { module: { select: { slug: true, title: true, order: true } } },
  });
  if (!lesson) { res.status(404).json({ error: "Lesson not found." }); return; }
  const completed = await prisma.workshopProgress.findUnique({
    where: { userId_lessonId: { userId: actor.progressUserId, lessonId: lesson.id } },
    select: { completedAt: true },
  });
  const siblings = await prisma.workshopLesson.findMany({
    where: publishedLessonWhere(),
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
    select: { slug: true, id: true },
  });
  const index = siblings.findIndex((row) => row.id === lesson.id);
  res.json({
    slug: lesson.slug,
    title: lesson.title,
    minutes: lesson.minutes,
    body: lesson.body,
    takeaways: parseTakeaways(lesson.takeaways),
    exercise: lesson.exercise,
    completed: !!completed,
    module: { slug: lesson.module.slug, title: lesson.module.title },
    prevSlug: index > 0 ? siblings[index - 1]?.slug ?? null : null,
    nextSlug: index >= 0 && index < siblings.length - 1 ? siblings[index + 1]?.slug ?? null : null,
  });
});

router.post("/workshop/lessons/:slug/complete", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const actor = await workshopActor(user);
  const tier = actor.tier;
  if (!canAccessWorkshop(tier, actor.testMode)) {
    res.status(403).json({ error: "Upgrade your plan to open the AI Workshop." });
    return;
  }
  if (user.isImpersonating && !user.impersonateAllowEdits) {
    res.status(403).json({ error: "View-as-client is read-only." });
    return;
  }
  const lesson = await prisma.workshopLesson.findFirst({ where: { slug: one(req.params.slug), ...publishedLessonWhere() }, select: { id: true } });
  if (!lesson) { res.status(404).json({ error: "Lesson not found." }); return; }
  await prisma.workshopProgress.upsert({
    where: { userId_lessonId: { userId: actor.progressUserId, lessonId: lesson.id } },
    create: { userId: actor.progressUserId, lessonId: lesson.id },
    update: {},
  });
  const summary = await workshopSummary(actor.progressUserId, tier, actor.testMode);
  res.json({ ok: true, ...summary });
});

const QuizBody = z.object({ answers: z.array(z.number().int()).max(20) });

router.post("/workshop/modules/:slug/quiz", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const actor = await workshopActor(user);
  const tier = actor.tier;
  if (!canAccessWorkshop(tier, actor.testMode)) {
    res.status(403).json({ error: "Upgrade your plan to open the AI Workshop." });
    return;
  }
  if (user.isImpersonating && !user.impersonateAllowEdits) {
    res.status(403).json({ error: "View-as-client is read-only." });
    return;
  }
  const parsed = QuizBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "answers must be a list of choices." }); return; }
  const mod = await prisma.workshopModule.findFirst({ where: { slug: one(req.params.slug), status: "PUBLISHED" } });
  if (!mod) { res.status(404).json({ error: "Module not found." }); return; }
  const questions = parseQuiz(mod.quizJson);
  if (!questions.length) { res.status(404).json({ error: "This module has no check." }); return; }
  const scored = scoreQuiz(parsed.data.answers, questions);
  const saved = await prisma.workshopQuizResult.upsert({
    where: { userId_moduleId: { userId: actor.progressUserId, moduleId: mod.id } },
    create: { userId: actor.progressUserId, moduleId: mod.id, score: scored.score, total: scored.total },
    update: { score: scored.score, total: scored.total },
  });
  res.json({
    score: saved.score,
    total: saved.total,
    results: scored.results,
    note: "You scored this yourself. Shea does not grade it.",
  });
});

router.get("/workshop/modules/:slug/quiz", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const actor = await workshopActor(user);
  const tier = actor.tier;
  if (!canAccessWorkshop(tier, actor.testMode)) {
    res.status(403).json({ error: "Upgrade your plan to open the AI Workshop." });
    return;
  }
  const mod = await prisma.workshopModule.findFirst({ where: { slug: one(req.params.slug), status: "PUBLISHED" } });
  if (!mod) { res.status(404).json({ error: "Module not found." }); return; }
  const questions = parseQuiz(mod.quizJson).map(({ prompt, choices }) => ({ prompt, choices }));
  const prior = await prisma.workshopQuizResult.findUnique({ where: { userId_moduleId: { userId: actor.progressUserId, moduleId: mod.id } } });
  res.json({
    slug: mod.slug,
    title: mod.title,
    questions,
    prior: prior ? { score: prior.score, total: prior.total } : null,
  });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

router.get("/admin/workshop", withUser, requireAdmin, async (_req, res) => {
  const modules = await prisma.workshopModule.findMany({
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  res.json(modules);
});

const ModulePatch = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(2000).optional(),
  order: z.number().int().min(0).max(999).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  quizJson: z.string().max(20000).optional(),
});

router.put("/admin/workshop/modules/:id", withUser, requireAdmin, async (req, res) => {
  const parsed = ModulePatch.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid module." }); return; }
  if (parsed.data.quizJson !== undefined) {
    try { JSON.parse(parsed.data.quizJson); } catch { res.status(422).json({ error: "Quiz must be JSON." }); return; }
  }
  const updated = await prisma.workshopModule.update({ where: { id: one(req.params.id) }, data: parsed.data });
  res.json(updated);
});

const LessonPatch = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(20000).optional(),
  minutes: z.number().int().min(1).max(180).optional(),
  takeaways: z.string().max(5000).optional(),
  exercise: z.string().max(5000).optional(),
  order: z.number().int().min(0).max(999).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

router.put("/admin/workshop/lessons/:id", withUser, requireAdmin, async (req, res) => {
  const parsed = LessonPatch.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid lesson." }); return; }
  const updated = await prisma.workshopLesson.update({ where: { id: one(req.params.id) }, data: parsed.data });
  res.json(updated);
});

const ReorderBody = z.object({
  modules: z.array(z.object({ id: z.string(), order: z.number().int() })).optional(),
  lessons: z.array(z.object({ id: z.string(), order: z.number().int() })).optional(),
});

router.post("/admin/workshop/reorder", withUser, requireAdmin, async (req, res) => {
  const parsed = ReorderBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid order." }); return; }
  await prisma.$transaction([
    ...(parsed.data.modules ?? []).map((row) => prisma.workshopModule.update({ where: { id: row.id }, data: { order: row.order } })),
    ...(parsed.data.lessons ?? []).map((row) => prisma.workshopLesson.update({ where: { id: row.id }, data: { order: row.order } })),
  ]);
  res.json({ ok: true });
});

router.get("/admin/workshop/progress", withUser, requireAdmin, async (_req, res) => {
  const [lessons, clients, progress] = await Promise.all([
    prisma.workshopLesson.count({ where: publishedLessonWhere() }),
    prisma.client.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, tier: true, userId: true, user: { select: { name: true, email: true } } },
    }),
    prisma.workshopProgress.groupBy({ by: ["userId"], _count: { _all: true } }),
  ]);
  const byUser = new Map(progress.map((row) => [row.userId, row._count._all]));
  res.json({
    publishedLessons: lessons,
    clients: clients.map((client) => {
      const completed = byUser.get(client.userId) ?? 0;
      return {
        clientId: client.id,
        name: client.user?.name ?? client.user?.email ?? "Client",
        tier: client.tier,
        completedLessons: completed,
        totalLessons: lessons,
        percent: progressPercent(completed, lessons),
      };
    }),
  });
});

export default router;
