/**
 * GET /go/:slug — referral link redirect with click tracking.
 *
 * 1. Finds the Tool by slug.
 * 2. Logs a ToolClick (toolId, clientId if signed in, source query param).
 *    No raw IP is stored; IP hashing uses the existing audit.ts helper only
 *    when the admin opts in via HASH_CLICK_IPS=true.
 * 3. Redirects to tool.referralUrl when set and hasReferral=true, else tool.officialUrl.
 *
 * Product boundary: ATG never stores full IPs; clientId is Clerk-auth-derived.
 */

import { Router } from "express";
import { withUser, type AuthedRequest } from "../lib/auth";
import { prisma } from "../lib/db";

const router = Router();

router.get("/go/:slug", withUser, async (req, res) => {
  const slug = (req.params.slug as string).toLowerCase().trim();
  const source = typeof req.query.src === "string" ? req.query.src.slice(0, 80) : "unknown";

  const tool = await prisma.tool.findFirst({ where: { slug, enabled: true } });
  if (!tool) {
    res.status(404).send("Resource not found.");
    return;
  }

  const user = (req as AuthedRequest).atgUser;
  const clientId = user?.clientId ?? null;

  // Log the click asynchronously — never block the redirect
  prisma.toolClick.create({
    data: { toolId: tool.id, clientId, source },
  }).catch(console.error);

  const destination =
    tool.hasReferral && tool.referralUrl.trim()
      ? tool.referralUrl.trim()
      : tool.officialUrl;

  res.redirect(302, destination);
});

export default router;
