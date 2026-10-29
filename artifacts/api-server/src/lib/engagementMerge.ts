/**
 * Draft a merged engagement review once every required role has submitted.
 * The engagement stays in "reviewing". Shea still approves it.
 */

import { prisma } from "./db";
import { generateMergedReview, type MemberSubmission } from "./engagementAI";
import type { AnsweredQuestion } from "./discoveryAI";

export function requiredRolesComplete(rolesRequired: string[], submittedRoles: string[]): boolean {
  if (rolesRequired.length === 0) return false;
  const have = new Set(submittedRoles.map((role) => role.trim().toLowerCase()).filter(Boolean));
  return rolesRequired.every((role) => have.has(role.trim().toLowerCase()));
}

export async function maybeDraftMergedReview(engagementId: string): Promise<boolean> {
  const eng = await prisma.discoveryEngagement.findUnique({
    where: { id: engagementId },
    include: {
      members: true,
      intakes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!eng || eng.mergedReview || eng.status === "approved") return false;

  const required = (() => {
    try { return JSON.parse(eng.rolesRequired) as string[]; } catch { return []; }
  })();
  const submitted = eng.members
    .filter((member) => member.status === "submitted" && !member.revokedAt)
    .map((member) => member.role);
  if (!requiredRolesComplete(required, submitted)) return false;

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

  if (tokensUsed > 0 && eng.intakes.length > 0) {
    const perIntake = Math.ceil(tokensUsed / eng.intakes.length);
    for (const intake of eng.intakes) {
      await prisma.discoveryIntake.update({
        where: { id: intake.id },
        data: { tokensUsed: { increment: perIntake } },
      }).catch(() => null);
    }
  }
  return true;
}
