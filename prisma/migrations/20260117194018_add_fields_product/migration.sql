/*
  Warnings:

  - You are about to drop the column `salePrice` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "compareAtPrice" DOUBLE PRECISION,
ADD COLUMN     "cost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "salePrice",
ADD COLUMN     "compareAtPrice" DOUBLE PRECISION,
ADD COLUMN     "cost" DOUBLE PRECISION;
