-- CreateTable
CREATE TABLE "TestProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "parts" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestProgress_userId_testId_key" ON "TestProgress"("userId", "testId");

-- AddForeignKey
ALTER TABLE "TestProgress" ADD CONSTRAINT "TestProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestProgress" ADD CONSTRAINT "TestProgress_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
