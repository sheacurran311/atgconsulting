-- Run with psql -X -v ON_ERROR_STOP=1 against the intended Replit development database.
BEGIN TRANSACTION READ ONLY;

SELECT current_database() AS database_name, current_schema() AS schema_name;

-- Resolve the fields used by the fit-call and proposal routes without reading client rows.
SELECT "id", "discoveryIntakeId", "answersJson", "status", "revision",
       "completedAt", "createdAt", "updatedAt"
FROM "FitCallOutcome"
LIMIT 0;

SELECT "discoveryIntakeId", "fitCallRevision", "deliveryPlanJson", "googleDocId",
       "googleDocExportState", "googleDocExportedAt", "approvedAt", "acceptedAt"
FROM "DiscoveryProposal"
LIMIT 0;

COMMIT;
