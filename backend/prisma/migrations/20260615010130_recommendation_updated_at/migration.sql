-- AlterTable
-- Add the column nullable first, backfill existing rows from createdAt, then enforce NOT NULL.
ALTER TABLE "RecommendationItem" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "RecommendationItem" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "RecommendationItem" ALTER COLUMN "updatedAt" SET NOT NULL;
