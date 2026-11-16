import type { Prisma } from "@prisma/client";

// Hide automatic admin prospect shells without deleting them or hiding paid clients.
export const customerDirectoryWhere: Prisma.ClientWhereInput = {
  NOT: { user: { role: "ADMIN" }, tier: "NONE", status: "PROSPECT" },
};
