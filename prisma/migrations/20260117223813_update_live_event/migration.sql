-- AlterTable
ALTER TABLE "live_events" ADD COLUMN     "scheduledEndAt" TIMESTAMP(3),
ADD COLUMN     "scheduledStartAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "live_events_scheduledStartAt_idx" ON "live_events"("scheduledStartAt");
