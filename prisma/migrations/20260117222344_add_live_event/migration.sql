-- CreateEnum
CREATE TYPE "LivePlatform" AS ENUM ('TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LiveEventStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');

-- CreateTable
CREATE TABLE "live_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" "LivePlatform" NOT NULL,
    "liveUrl" TEXT NOT NULL,
    "status" "LiveEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "featuredProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pinnedProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_events_userId_idx" ON "live_events"("userId");

-- CreateIndex
CREATE INDEX "live_events_status_idx" ON "live_events"("status");

-- AddForeignKey
ALTER TABLE "live_events" ADD CONSTRAINT "live_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
