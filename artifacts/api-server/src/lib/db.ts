import { PrismaClient } from "@prisma/client";

// PrismaClient singleton — prevents multiple instances during hot reload in dev.
// Works with any DATABASE_URL: postgresql://, file: (local SQLite dev), etc.
// The provider in schema.prisma is "postgresql"; to use SQLite locally change it
// to "sqlite" and set DATABASE_URL="file:./prisma/dev.db".

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Verifies the database connection is live before the HTTP server starts.
 * Prisma manages the schema (via `db:push` or `migrate deploy`); this
 * function does NOT create or alter tables — it just pings the connection.
 */
export async function initializeDatabase(): Promise<void> {
  await prisma.$connect();
}
