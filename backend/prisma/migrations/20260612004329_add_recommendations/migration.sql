-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('FILM', 'BOOK');

-- CreateEnum
CREATE TYPE "RecommendationVerdict" AS ENUM ('PENDING', 'LIKED', 'DISLIKED');

-- CreateTable
CREATE TABLE "RecommendationItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "verdict" "RecommendationVerdict" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "posterUrl" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL DEFAULT '',
    "year" INTEGER,
    "author" TEXT,
    "extra" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationItem_userId_mediaType_verdict_idx" ON "RecommendationItem"("userId", "mediaType", "verdict");

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
