-- AlterTable
ALTER TABLE "TestResult" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_shareToken_key" ON "TestResult"("shareToken");
