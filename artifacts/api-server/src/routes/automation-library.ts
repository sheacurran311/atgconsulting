import { Router, type RequestHandler } from "express";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { NATIVE_REVIEWED_AT, nativePlatforms, recommendAutomationBots } from "../lib/automationLibrary";

async function libraryFor(clientId: string | null) {
  const intake = clientId ? await prisma.discoveryIntake.findFirst({ where: { clientId, status: { in: ["new", "reviewed", "report_sent", "converted"] } }, orderBy: { createdAt: "desc" }, select: { id: true, answers: true, createdAt: true } }) : null;
  const bots = recommendAutomationBots(intake?.answers ?? null);
  return { reviewedAt: NATIVE_REVIEWED_AT, providers: nativePlatforms, bots, recommendedIds: bots.filter((b) => b.recommended).slice(0, 6).map((b) => b.id), personalization: { hasIntake: !!intake, intakeDate: intake?.createdAt ?? null },
    note: "30 ATG-curated native workflow recipes, not a measured popularity ranking or preinstalled bots. Availability depends on your native account and connections. Installation, a saved schedule and a successful observed run are separate steps." };
}
export function createAutomationLibraryRouter(resolve: RequestHandler = withUser) {
  const router = Router();
  router.get("/automation-library", resolve, requireAuth, async (req, res) => {
    const user = (req as AuthedRequest).atgUser!;
    const client = user.clientId ? await prisma.client.findUnique({ where: { id: user.clientId }, select: { tier: true } }) : null;
    if (!(user.role === "ADMIN" && !user.isImpersonating) && client?.tier !== "SELF_SERVE") {
      res.status(403).json({ error: "The native automation library is available to DIY / Self-serve accounts and administrators." }); return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.json(await libraryFor(user.clientId)); // Caller-supplied customer IDs are deliberately ignored.
  });
  router.get("/admin/automation-library", resolve, requireAdmin, async (req, res) => {
    const user = (req as AuthedRequest).atgUser!;
    const clientId = typeof req.query.clientId === "string" ? req.query.clientId : user.clientId;
    if (clientId && !await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } })) { res.status(404).json({ error: "Client not found." }); return; }
    res.setHeader("Cache-Control", "private, no-store");
    res.json(await libraryFor(clientId));
  });
  return router;
}
export default createAutomationLibraryRouter();
