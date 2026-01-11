/*
  Warnings:

  - You are about to drop the column `allowAnalytics` on the `plan_configs` table. All the data in the column will be lost.
  - You are about to drop the column `allowCoupons` on the `plan_configs` table. All the data in the column will be lost.
  - You are about to drop the column `allowCustomDomain` on the `plan_configs` table. All the data in the column will be lost.
  - You are about to drop the column `maxImages` on the `plan_configs` table. All the data in the column will be lost.
  - Added the required column `maxActiveCoupons` to the `plan_configs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxImageSizeKB` to the `plan_configs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxImagesPerProduct` to the `plan_configs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "plan_configs" DROP COLUMN "allowAnalytics",
DROP COLUMN "allowCoupons",
DROP COLUMN "allowCustomDomain",
DROP COLUMN "maxImages",
ADD COLUMN     "canExportOrders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canUseAnalytics" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canUseCoupons" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canUseCustomDomain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canUseFlashSales" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasWatermark" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "imageMaxHeight" INTEGER NOT NULL DEFAULT 1600,
ADD COLUMN     "imageMaxWidth" INTEGER NOT NULL DEFAULT 1600,
ADD COLUMN     "imageQuality" INTEGER NOT NULL DEFAULT 85,
ADD COLUMN     "maxActiveCoupons" INTEGER NOT NULL,
ADD COLUMN     "maxBanners" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "maxCampaigns" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxImageSizeKB" INTEGER NOT NULL,
ADD COLUMN     "maxImagesPerProduct" INTEGER NOT NULL,
ADD COLUMN     "maxOffers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxOrdersPerMonth" INTEGER NOT NULL DEFAULT 100,
ALTER COLUMN "maxCategories" SET DEFAULT 5;
