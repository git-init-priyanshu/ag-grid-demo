/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Book` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Book` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Book_userId_key" ON "Book"("userId");
