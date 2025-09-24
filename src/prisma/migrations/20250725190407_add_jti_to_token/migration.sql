/*
  Warnings:

  - A unique constraint covering the columns `[jti]` on the table `Token` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `jti` to the `Token` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Token" ADD COLUMN     "jti" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Token_jti_key" ON "Token"("jti");

-- CreateIndex
CREATE INDEX "Token_jti_idx" ON "Token"("jti");
