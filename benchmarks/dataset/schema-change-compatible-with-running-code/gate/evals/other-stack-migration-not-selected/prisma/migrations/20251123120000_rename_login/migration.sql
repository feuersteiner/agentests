-- Rename the login column.
ALTER TABLE "User" RENAME COLUMN "login" TO "username";
ALTER TABLE "User" DROP COLUMN "legacyPlanId";
