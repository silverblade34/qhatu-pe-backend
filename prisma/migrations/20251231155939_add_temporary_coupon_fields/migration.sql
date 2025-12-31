-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "isTemporary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temporaryDurationMinutes" INTEGER;
