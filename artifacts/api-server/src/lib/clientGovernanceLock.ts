import type { Prisma } from "@prisma/client";

/** Serialize context changes with operator actions which rely on that context. */
export function lockClientGovernance(db: Prisma.TransactionClient, clientId: string) {
  return db.$queryRaw<Array<{id: string}>>`SELECT id FROM "Client" WHERE id = ${clientId} FOR UPDATE`;
}
