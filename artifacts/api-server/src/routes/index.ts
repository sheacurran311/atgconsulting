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

const router: IRouter = Router();

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

export default router;
