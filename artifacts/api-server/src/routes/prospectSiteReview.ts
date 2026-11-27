import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { reviewOfficialSite, safeOfficialUrl } from "../lib/prospectSiteReview";

const path = "/admin/prospecting/:id/site-review";
const enabled = () => process.env.ATG_PROSPECT_SITE_REVIEW === "true";
const dateFormat = new Intl.DateTimeFormat("sv-SE", {timeZone: "America/Denver"});
const publicValue = (row: {sourceUrl: string; observations: string | null; status: string; createdAt: Date}) => ({
  sourceUrl: row.sourceUrl, status: row.status, observedAt: row.createdAt,
  observations: row.observations ? JSON.parse(row.observations) : [],
});

export function createProspectSiteReviewRouter(auth = [withUser, requireAdmin], review = reviewOfficialSite) {
  const router = Router();
  router.use(path, ...auth, (req, res, next) => {
    const actor = (req as AuthedRequest).atgUser;
    res.set("Cache-Control", "private, no-store");
    if (!actor || actor.role !== "ADMIN" || actor.isImpersonating) {res.sendStatus(403); return;}
    next();
  });
  router.get(path, async (req, res) => {
    const rows = enabled() ? await prisma.prospectSiteReview.findMany({where: {prospectId: String(req.params.id)},
      orderBy: {createdAt: "desc"}, take: 5}) : [];
    res.json({enabled: enabled(), reviews: rows.map(publicValue)});
  });
  router.post(path, async (req, res) => {
    if (!enabled()) {res.sendStatus(404); return;}
    if (!z.object({confirmedOfficialAndAllowed: z.literal(true)}).strict().safeParse(req.body).success ||
      req.get("sec-fetch-site") === "cross-site" || !req.is("application/json")) {res.sendStatus(422); return;}
    const prospectId = String(req.params.id);
    const prospect = await prisma.atgProspect.findFirst({where: {id: prospectId, status: {notIn: ["SUPPRESSED", "DISQUALIFIED"]}}});
    const source = prospect && safeOfficialUrl(prospect.website);
    if (!prospect || !source) {res.status(422).json({error: "Select an eligible prospect with its final public HTTPS page."}); return;}
    const actor = (req as AuthedRequest).atgUser!;
    const day = dateFormat.format(new Date());
    try {
      const run = await prisma.$transaction(async db => {
        if (await db.prospectSiteReview.count({where: {day}}) >= 20) return null;
        return db.prospectSiteReview.create({data: {prospectId, day, sourceUrl: source.href, reviewedBy: actor.id}});
      }, {isolationLevel: Prisma.TransactionIsolationLevel.Serializable});
      if (!run) {res.status(429).json({error: "The daily website review limit was reached."}); return;}
      let observations: string[];
      try {({observations} = await review(source.href));}
      catch {
        await prisma.prospectSiteReview.update({where: {id: run.id}, data: {status: "unavailable"}});
        res.status(422).json({error: "The page or crawl policy did not permit a bounded automated review. Record a manual observation if authorized."});
        return;
      }
      const saved = await prisma.prospectSiteReview.update({where: {id: run.id},
        data: {status: "needs_review", observations: JSON.stringify(observations)}});
      res.status(201).json(publicValue(saved));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
        res.status(409).json({error: "A review already ran today or another review is starting. Reload before retrying."}); return;
      }
      throw error;
    }
  });
  return router;
}
export default createProspectSiteReviewRouter();
