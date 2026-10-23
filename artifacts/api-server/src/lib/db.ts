import { PrismaClient } from "@prisma/client";

// Preserve the imported app's SQLite database rather than replacing its storage.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(process.env.DATABASE_URL?.startsWith("file:")
      ? { datasources: { db: { url: process.env.DATABASE_URL } } }
      : {}),
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// SQLite is retained from the import. Initialize only missing tables, never
// replace existing records. Run before listening so health cannot pass early.
export async function initializeDatabase() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "IntakeSubmission" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "industry" TEXT NOT NULL,
      "bizSize" TEXT NOT NULL,
      "areas" TEXT NOT NULL,
      "aiComfort" INTEGER NOT NULL,
      "tools" TEXT NOT NULL,
      "timeSinks" TEXT NOT NULL,
      "automateFirst" TEXT,
      "hoursLost" INTEGER NOT NULL,
      "preferredHelp" TEXT NOT NULL,
      "freeText" TEXT,
      "honeypot" TEXT NOT NULL DEFAULT '',
      "ipHash" TEXT,
      "llmResponse" TEXT,
      "responseType" TEXT,
      "emailSent" BOOLEAN NOT NULL DEFAULT false
    )
  `);
}
