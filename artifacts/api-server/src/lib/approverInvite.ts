/**
 * When an intake says decision authority is partial or none, create an
 * engagement invite for the named approver and return the link.
 * The link is shown to the respondent and included in Shea's notification.
 * It is never emailed to the approver.
 */

import { randomBytes } from "crypto";
import { prisma } from "./db";

function appUrl(): string {
  return process.env.APP_URL ?? "https://atgconsulting.io";
}

function answerValue(answersJson: string, id: string): string | null {
  try {
    const rows = JSON.parse(answersJson) as Array<{ id?: string; answer?: string }>;
    const found = rows.find((row) => row.id === id)?.answer;
    return typeof found === "string" && found.trim() ? found.trim() : null;
  } catch {
    return null;
  }
}

export async function ensureApproverInvite(intakeId: string): Promise<{ inviteUrl: string | null; engagementId: string | null }> {
  const intake = await prisma.discoveryIntake.findUnique({ where: { id: intakeId } });
  if (!intake) return { inviteUrl: null, engagementId: null };
  if (intake.decisionAuthority !== "partial" && intake.decisionAuthority !== "none") {
    return { inviteUrl: null, engagementId: intake.engagementId };
  }
  if (!intake.approverEmail) return { inviteUrl: null, engagementId: intake.engagementId };

  const companyName = answerValue(intake.answers, "company_name")
    ?? intake.contactName
    ?? "New intake";
  const ownerRole = intake.respondentRole ?? "owner";
  const approverRole = intake.approverRole?.trim() || "approver";

  let engagementId = intake.engagementId;
  if (!engagementId) {
    const eng = await prisma.discoveryEngagement.create({
      data: {
        companyName,
        primaryEmail: intake.contactEmail,
        rolesRequired: JSON.stringify([ownerRole, approverRole]),
        intakes: { connect: { id: intake.id } },
      },
    });
    engagementId = eng.id;
    if (intake.contactEmail) {
      await prisma.engagementMember.create({
        data: {
          engagementId,
          name: intake.contactName,
          email: intake.contactEmail,
          role: ownerRole,
          status: "submitted",
          discoveryIntakeId: intake.id,
        },
      });
    }
  }

  const current = await prisma.discoveryEngagement.findUnique({
    where: { id: engagementId },
    select: { rolesRequired: true },
  });
  const required = (() => {
    try { return JSON.parse(current?.rolesRequired ?? "[]") as string[]; } catch { return []; }
  })();
  const next = [...required];
  for (const role of [ownerRole, approverRole]) {
    if (!next.some((item) => item.trim().toLowerCase() === role.trim().toLowerCase())) next.push(role);
  }
  if (next.length !== required.length) {
    await prisma.discoveryEngagement.update({
      where: { id: engagementId },
      data: { rolesRequired: JSON.stringify(next) },
    });
  }

  const existing = await prisma.engagementMember.findFirst({
    where: { engagementId, email: intake.approverEmail, revokedAt: null },
  });
  if (existing?.inviteToken) {
    return { inviteUrl: `${appUrl()}/intake/e/${existing.inviteToken}`, engagementId };
  }

  const token = randomBytes(12).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.engagementMember.create({
    data: {
      engagementId,
      name: intake.approverName,
      email: intake.approverEmail,
      role: approverRole,
      inviteToken: token,
      inviteExpiresAt: expiresAt,
    },
  });

  return { inviteUrl: `${appUrl()}/intake/e/${token}`, engagementId };
}
