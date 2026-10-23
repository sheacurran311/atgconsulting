import { Router, type IRouter } from "express";
import healthRouter from "./health";
import intakeRouter from "./intake";
import accountRouter from "./account";

const router: IRouter = Router();

router.use(healthRouter);
router.use(intakeRouter);
router.use(accountRouter);

export default router;
