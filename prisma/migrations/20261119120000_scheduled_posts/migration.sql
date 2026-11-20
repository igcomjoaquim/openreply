-- CreateEnum
CREATE TYPE "ScheduledPostType" AS ENUM ('REEL', 'IMAGE', 'CAROUSEL');

-- CreateEnum
CREATE TYPE "ScheduledPostStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "type" "ScheduledPostType" NOT NULL,
    "media" JSONB NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "coverName" TEXT,
    "thumbOffsetMs" INTEGER,
    "shareToFeed" BOOLEAN NOT NULL DEFAULT true,
    "publishAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledPostStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "containerId" TEXT,
    "mediaId" TEXT,
    "permalink" TEXT,
    "publishingStartedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledPost_status_publishAt_idx" ON "ScheduledPost"("status", "publishAt");

-- CreateIndex
CREATE INDEX "ScheduledPost_instagramAccountId_idx" ON "ScheduledPost"("instagramAccountId");

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

