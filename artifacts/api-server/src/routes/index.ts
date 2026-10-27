import { Router, type IRouter } from "express";
import healthRouter from "./health";
import intakeRouter from "./intake";
import accountRouter from "./account";
import planRouter from "./plan";
import clientRouter from "./client";
import adminRouter from "./admin";
import documentsRouter from "./documents";
import cronRouter from "./cron";
import workbenchRouter from "./workbench";
import tiersRouter from "./tiers";
import playbookRouter from "./playbook";
import sessionsRouter from "./sessions";
import billingRouter from "./billing";
import workflowTemplatesRouter from "./workflow-templates";
import skillsRouter from "./skills";
import skills2Router from "./skills2";
import skills3Router from "./skills3";
import portalRouter from "./portal";
import dayRouter from "./day";
import toolsRouter from "./tools";
import goRouter from "./go";
import knowledgeRouter from "./knowledge";
import aiAssistRouter from "./ai-assist";
import installVerifyRouter from "./install-verify";
import impersonateRouter from "./impersonate";
import { blockIfImpersonating } from "../lib/impersonate";

const router: IRouter = Router();

// Global impersonation mutation guard — runs before all route handlers.
// Admin routes are excluded (impersonation toggle itself must pass through).
// GET/HEAD always pass through.
router.use((req, res, next) => {
  if (req.path.startsWith("/admin/impersonate")) { next(); return; }
  blockIfImpersonating(req, res, next);
});

router.use(healthRouter);
router.use(intakeRouter);
router.use(accountRouter);
router.use(planRouter);
router.use(clientRouter);
router.use(adminRouter);
router.use(documentsRouter);
router.use(cronRouter);
router.use(workbenchRouter);
router.use(tiersRouter);
router.use(playbookRouter);
router.use(sessionsRouter);
router.use(billingRouter);
router.use(workflowTemplatesRouter);
router.use(skillsRouter);
router.use(skills2Router);
router.use(skills3Router);
router.use(portalRouter);
router.use(dayRouter);
router.use(toolsRouter);
router.use(goRouter);
router.use(knowledgeRouter);
router.use(aiAssistRouter);
router.use(installVerifyRouter);
router.use(impersonateRouter);

export default router;
