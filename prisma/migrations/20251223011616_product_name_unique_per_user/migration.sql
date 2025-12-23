/*
  Warnings:

  - A unique constraint covering the columns `[userId,name]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "products_userId_name_key" ON "products"("userId", "name");
