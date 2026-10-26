import { PrismaClient } from "@prisma/client";
import { TEMPLATE_SEEDS, PHASE2_SEEDS, PHASE3_SEEDS } from "./templates";

// PrismaClient singleton — prevents multiple instances during hot reload in dev.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Verifies the database connection is live, then seeds WorkflowTemplate rows
 * from code defaults if they don't already exist.
 * Admin edits are preserved — seeding only creates missing slugs.
 */
export async function initializeDatabase(): Promise<void> {
  await prisma.$connect();
  await seedWorkflowTemplates();
}

async function seedWorkflowTemplates(): Promise<void> {
  try {
    const allSeeds = [...TEMPLATE_SEEDS, ...PHASE2_SEEDS, ...PHASE3_SEEDS];
    for (const seed of allSeeds) {
      const existing = await prisma.workflowTemplate.findUnique({ where: { slug: seed.slug } });
      if (!existing) {
        await prisma.workflowTemplate.create({
          data: {
            slug:               seed.slug,
            name:               seed.name,
            description:        seed.description,
            verticalTags:       JSON.stringify(seed.verticalTags),
            minTier:            seed.minTier,
            systemPrompt:       seed.systemPrompt,
            userPromptTemplate: seed.userPromptTemplate,
            inputSchema:        seed.inputSchema,
            outputFormat:       seed.outputFormat,
          },
        });
      }
    }
  } catch (err) {
    // Non-fatal: DB may not have the table yet (before db:push on fresh deploy).
    console.warn("[db] WorkflowTemplate seed skipped:", (err as Error).message);
  }
}
