/*
  Warnings:

  - A unique constraint covering the columns `[testType]` on the table `Test` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `testType` to the `Test` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "testType" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Test_testType_key" ON "Test"("testType");
