/**
 * Publish posts Shea has already approved. Drafts are left alone.
 */

import { prisma } from "./db";

/** Approved posts go live now, or at publishAt when that time has arrived. */
export function contentReadyToPublish(post: { status: string; publishAt: Date | null }, now: Date): boolean {
  if (post.status !== "approved") return false;
  if (post.publishAt && post.publishAt.getTime() > now.getTime()) return false;
  return true;
}

export async function publishApprovedContent(now = new Date()): Promise<number> {
  const approved = await prisma.content.findMany({
    where: { status: "approved" },
    select: { id: true, publishAt: true, status: true },
  });
  const due = approved.filter((post) => contentReadyToPublish(post, now));
  for (const post of due) {
    await prisma.content.update({
      where: { id: post.id },
      data: { status: "published", publishAt: post.publishAt ?? now },
    });
  }
  return due.length;
}
