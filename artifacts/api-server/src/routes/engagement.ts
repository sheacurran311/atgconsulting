/**
 * Multi-person engagement routes.
 *
 * Public:
 *   POST /api/discovery/engagement/create         — create an engagement from a submitted intake
 *   GET  /api/discovery/engagement/member/:token  — validate a member invite token
 *   PATCH /api/discovery/engagement/member/:token/status — update member status as they progress
 *
 * Admin:
 *   GET    /api/admin/engagements                    — list engagements
 *   GET    /api/admin/engagements/:id                — detail (members + submissions)
 *   POST   /api/admin/engagements/:id/members        — add a member + create invite link
 *   DELETE /api/admin/engagements/:id/members/:mid   — revoke member invite
 *   PATCH  /api/admin/engagements/:id               — update rolesRequired, status
 *   POST   /api/admin/engagements/:id/merge          — trigger Grok merged review
 *   POST   /api/admin/engagements/:id/suggest-members — suggest who else should contribute
 *   GET    /api/admin/engagements/:id/signers        — get per-module proposal signers
 */

import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { audit } from "../lib/audit";
import {
  suggestMembers, generateMergedReview, generateProposalSigners,
  type MemberSubmission,
} from "../lib/engagementAI";
import { getRoleConfig } from "../lib/roleQuestions";
import type { AnsweredQuestion } from "../lib/discoveryAI";

const router = Router();

function makeToken(): string {
  return randomBytes(12).toString("base64url");
}

// ── Public: create engagement from a submitted intake ─────────────────────────

const CreateEngBody = z.object({
  intakeId: z.string().min(1),
  companyName: z.string().min(1).max(200),
});

router.post("/discovery/engagement/create", async (req, res) => {
  const parsed = CreateEngBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "intakeId and companyName are required." }); return; }

  const intake = await prisma.discoveryIntake.findUnique({ where: { id: parsed.data.intakeId } });
  if (!intake) { res.status(404).json({ error: "Intake not found." }); return; }

  // Idempotent: if already in an engagement, return that one
  if (intake.engagementId) {
    res.json({ engagementId: intake.engagementId, existing: true });
    return;
  }

  const eng = await prisma.discoveryEngagement.create({
    data: {
      companyName: parsed.data.companyName,
      primaryEmail: intake.contactEmail,
      intakes: { connect: { id: intake.id } },
    },
  });

  // Create an 'owner' member record for the first respondent
  if (intake.contactEmail) {
    await prisma.engagementMember.create({
      data: {
        engagementId: eng.id,
        name: intake.contactName,
        email: intake.contactEmail,
        role: intake.respondentRole ?? "owner",
        status: "submitted",
        discoveryIntakeId: intake.id,
      },
    });
  }

  res.status(201).json({ engagementId: eng.id, existing: false });
});

// ── Public: validate member invite token ──────────────────────────────────────

router.get("/discovery/engagement/member/:token", async (req, res) => {
  const member = await prisma.engagementMember.findUnique({
    where: { inviteToken: req.params.token as string },
    include: { engagement: { select: { id: true, companyName: true } } },
  });
  if (!member) { res.status(404).json({ error: "Invite not found." }); return; }
  if (member.revokedAt) { res.status(410).json({ error: "This invite has been revoked." }); return; }
  if (member.inviteExpiresAt && member.inviteExpiresAt < new Date()) {
    res.status(410).json({ error: "This invite has expired." }); return;
  }
  if (member.status === "submitted") { res.status(409).json({ error: "You have already submitted this intake." }); return; }

  const config = getRoleConfig(member.role);
  res.json({
    memberId:    member.id,
    role:        member.role,
    roleLabel:   config.label,
    roleDesc:    config.description,
    maxQuestions:config.maxQuestions,
    prefilledName: member.name,
    prefilledEmail:member.email,
    companyName: member.engagement?.companyName,
    engagementId:member.engagementId,
  });
});

// ── Public: update member status ──────────────────────────────────────────────

router.patch("/discovery/engagement/member/:token/status", async (req, res) => {
  const parsed = z.object({
    status: z.enum(["opened", "in_progress", "submitted"]),
    intakeId: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid status." }); return; }

  const member = await prisma.engagementMember.findUnique({ where: { inviteToken: req.params.token as string } });
  if (!member || member.revokedAt) { res.status(404).json({ error: "Member not found." }); return; }

  await prisma.engagementMember.update({
    where: { id: member.id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.intakeId && parsed.data.status === "submitted"
        ? { discoveryIntakeId: parsed.data.intakeId }
        : {}),
    },
  });

  // If submitted, link the intake to the engagement
  if (parsed.data.status === "submitted" && parsed.data.intakeId) {
    await prisma.discoveryIntake.update({
      where: { id: parsed.data.intakeId },
      data: { engagementId: member.engagementId, respondentRole: member.role },
    }).catch(() => null);
  }

  res.json({ ok: true });
});

// ── Admin: list engagements ───────────────────────────────────────────────────

router.get("/admin/engagements", withUser, requireAdmin, async (_req, res) => {
  const engagements = await prisma.discoveryEngagement.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: { select: { members: true, intakes: true } },
    },
  });
  res.json(engagements);
});

// ── Admin: engagement detail ──────────────────────────────────────────────────

router.get("/admin/engagements/:id", withUser, requireAdmin, async (req, res) => {
  const eng = await prisma.discoveryEngagement.findUnique({
    where: { id: req.params.id as string },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      intakes: {
        select: {
          id: true, contactEmail: true, contactName: true, status: true,
          respondentRole: true, decisionAuthority: true,
          approverName: true, approverEmail: true, answers: true,
          tokensUsed: true, createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!eng) { res.status(404).json({ error: "Engagement not found." }); return; }

  // Calculate total tokens across all intakes
  const totalTokens = eng.intakes.reduce((s, i) => s + i.tokensUsed, 0);
  res.json({ ...eng, totalTokens });
});

// ── Admin: add member + invite link ──────────────────────────────────────────

const MemberBody = z.object({
  name:  z.string().max(100).optional(),
  email: z.string().email().toLowerCase().optional(),
  role:  z.string().min(1).max(80),
  expiryDays: z.number().int().min(1).max(60).optional(),
});

router.post("/admin/engagements/:id/members", withUser, requireAdmin, async (req, res) => {
  const eng = await prisma.discoveryEngagement.findUnique({ where: { id: req.params.id as string } });
  if (!eng) { res.status(404).json({ error: "Engagement not found." }); return; }

  const parsed = MemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "role is required.", issues: parsed.error.flatten() }); return; }

  const token = makeToken();
  const days = parsed.data.expiryDays ?? 30;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const member = await prisma.engagementMember.create({
    data: {
      engagementId: eng.id,
      name:  parsed.data.name,
      email: parsed.data.email,
      role:  parsed.data.role,
      inviteToken: token,
      inviteExpiresAt: expiresAt,
    },
  });

  await audit({
    actorUserId: (req as AuthedRequest).atgUser?.id,
    action: "ENGAGEMENT_MEMBER_ADDED",
    entity: "DiscoveryEngagement",
    entityId: eng.id,
    meta: { role: parsed.data.role, name: parsed.data.name, email: parsed.data.email },
  });

  res.status(201).json({ ...member, link: `/intake/e/${token}` });
});

// ── Admin: revoke member invite ───────────────────────────────────────────────

router.delete("/admin/engagements/:id/members/:mid", withUser, requireAdmin, async (req, res) => {
  const member = await prisma.engagementMember.findFirst({
    where: { id: req.params.mid as string, engagementId: req.params.id as string },
  });
  if (!member) { res.status(404).json({ error: "Member not found." }); return; }
  await prisma.engagementMember.update({
    where: { id: member.id },
    data: { revokedAt: new Date(), status: "skipped" },
  });
  res.json({ ok: true });
});

// ── Admin: update engagement ──────────────────────────────────────────────────

const EngPatch = z.object({
  rolesRequired: z.array(z.string()).optional(),
  status: z.enum(["collecting", "reviewing", "approved"]).optional(),
  companyName: z.string().max(200).optional(),
});

router.patch("/admin/engagements/:id", withUser, requireAdmin, async (req, res) => {
  const parsed = EngPatch.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed." }); return; }
  const data: Record<string, unknown> = {};
  if (parsed.data.rolesRequired !== undefined) data.rolesRequired = JSON.stringify(parsed.data.rolesRequired);
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.companyName !== undefined) data.companyName = parsed.data.companyName;
  const updated = await prisma.discoveryEngagement.update({ where: { id: req.params.id as string }, data });
  res.json(updated);
});

// ── Admin: suggest additional members ────────────────────────────────────────

router.post("/admin/engagements/:id/suggest-members", withUser, requireAdmin, async (req, res) => {
  const eng = await prisma.discoveryEngagement.findUnique({
    where: { id: req.params.id as string },
    include: { intakes: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!eng) { res.status(404).json({ error: "Engagement not found." }); return; }

  const firstIntake = eng.intakes[0];
  if (!firstIntake) { res.status(400).json({ error: "No intake submissions yet." }); return; }

  const answers: AnsweredQuestion[] = (() => {
    try { return JSON.parse(firstIntake.answers) as AnsweredQuestion[]; } catch { return []; }
  })();

  const { suggestions, tokensUsed } = await suggestMembers(
    answers,
    firstIntake.decisionAuthority,
    { name: firstIntake.approverName, email: firstIntake.approverEmail, role: firstIntake.approverRole },
  );

  // Update intake token count
  if (tokensUsed > 0) {
    await prisma.discoveryIntake.update({
      where: { id: firstIntake.id },
      data: { tokensUsed: { increment: tokensUsed } },
    });
  }

  res.json({ suggestions, tokensUsed });
});

// ── Admin: generate merged review ─────────────────────────────────────────────

router.post("/admin/engagements/:id/merge", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const eng = await prisma.discoveryEngagement.findUnique({
    where: { id: req.params.id as string },
    include: {
      intakes: { orderBy: { createdAt: "asc" } },
      members: { select: { role: true, name: true } },
    },
  });
  if (!eng) { res.status(404).json({ error: "Engagement not found." }); return; }

  const submissions: MemberSubmission[] = eng.intakes.map((intake) => ({
    memberRole: intake.respondentRole ?? "owner",
    memberName: intake.contactName,
    answers: (() => { try { return JSON.parse(intake.answers) as AnsweredQuestion[]; } catch { return []; } })(),
    decisionAuthority: intake.decisionAuthority,
  }));

  const { review, tokensUsed } = await generateMergedReview(eng.id, eng.companyName, submissions);

  await prisma.discoveryEngagement.update({
    where: { id: eng.id },
    data: { mergedReview: JSON.stringify(review), status: "reviewing" },
  });

  // Distribute token cost across all intakes evenly
  if (tokensUsed > 0 && eng.intakes.length > 0) {
    const perIntake = Math.ceil(tokensUsed / eng.intakes.length);
    for (const intake of eng.intakes) {
      await prisma.discoveryIntake.update({
        where: { id: intake.id },
        data: { tokensUsed: { increment: perIntake } },
      }).catch(() => null);
    }
  }

  await audit({
    actorUserId: actor.id, action: "ENGAGEMENT_REVIEW_MERGED",
    entity: "DiscoveryEngagement", entityId: eng.id,
    meta: { submissions: submissions.length, tokensUsed },
  });

  res.json({ ok: true, review, tokensUsed });
});

// ── Admin: per-module proposal signers ───────────────────────────────────────

router.get("/admin/engagements/:id/signers", withUser, requireAdmin, async (req, res) => {
  const eng = await prisma.discoveryEngagement.findUnique({
    where: { id: req.params.id as string },
    include: {
      members: true,
      intakes: {
        where: { status: { not: "new" } },
        select: { respondentRole: true, decisionAuthority: true, contactName: true, contactEmail: true },
      },
    },
  });
  if (!eng) { res.status(404).json({ error: "Engagement not found." }); return; }

  const membersForSigners = eng.members.filter((m) => m.status === "submitted").map((m) => {
    const intake = eng.intakes.find((i) => i.respondentRole === m.role);
    return {
      role: m.role,
      name: m.name ?? intake?.contactName ?? null,
      email: m.email ?? intake?.contactEmail ?? null,
      decisionAuthority: intake?.decisionAuthority ?? null,
    };
  });

  // Get scope items from the linked proposal if it exists
  const firstIntake = await prisma.discoveryIntake.findFirst({
    where: { engagementId: eng.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const proposal = firstIntake
    ? await prisma.discoveryProposal.findUnique({ where: { discoveryIntakeId: firstIntake.id }, select: { scope: true } })
    : null;
  const scopeItems = (proposal?.scope ?? "")
    .split("\n")
    .filter((s) => s.trim().startsWith("-") || s.trim().startsWith("•"))
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .slice(0, 10);

  const { signers, tokensUsed } = await generateProposalSigners(eng.companyName, membersForSigners, scopeItems);
  res.json({ signers, tokensUsed });
});

export default router;
