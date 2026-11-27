import type { Prisma } from "@prisma/client";
import { normalizeProspectDomain } from "./prospecting";

type Database = Pick<Prisma.TransactionClient, "atgProspectSuppression">;
export const contactIdentity = (value: string) => value.trim().toLowerCase();
export const suppressionKeys = (domain: string, email?: string) => [
  ...(normalizeProspectDomain(domain) ? ["domain:" + normalizeProspectDomain(domain)] : []),
  ...(email ? ["email:" + contactIdentity(email)] : []),
];

export async function suppressProspect(db: Database, keys: string[], actorUserId: string, source: string) {
  await db.atgProspectSuppression.createMany({data: [...new Set(keys)].map(key => ({key, actorUserId, source})), skipDuplicates: true});
}

export async function isSuppressed(db: Database, keys: string[]) {
  return keys.length > 0 && !!await db.atgProspectSuppression.findFirst({where: {key: {in: keys}}, select: {key: true}});
}
