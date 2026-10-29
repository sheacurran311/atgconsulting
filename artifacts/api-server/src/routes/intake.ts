/**
 * Legacy intake routes — REMOVED.
 * The /api/intake endpoint is no longer used.
 * All new intake submissions go through the adaptive discovery intake at /intake
 * and are stored as DiscoveryIntake records.
 *
 * This file is a stub to avoid import errors during the removal transition.
 * The router below exports an empty router.
 */

import { Router } from "express";

const router = Router();

// No routes — all removed. See routes/discovery.ts for the new intake flow.

export default router;
