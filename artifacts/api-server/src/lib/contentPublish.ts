/**
 * Publish posts Shea has already approved. Drafts are left alone.
 */

import { prisma } from "./db";

export async function publishApprovedContent(): Promise<number> {
  const approved = await prisma.content.findMany({
    where: { status: "approved" },
    select: { id: true, publishAt: true },
  });
  const now = new Date();
  for (const post of approved) {
    await prisma.content.update({
      where: { id: post.id },
      data: { status: "published", publishAt: post.publishAt ?? now },
    });
  }
  return approved.length;
}
