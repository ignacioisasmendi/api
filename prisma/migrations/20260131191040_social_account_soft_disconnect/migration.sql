/*
  Warnings:

  - You are about to drop the column `isActive` on the `SocialAccount` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SocialAccount_isActive_idx";

-- AlterTable
ALTER TABLE "SocialAccount" DROP COLUMN "isActive",
ADD COLUMN     "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "disconnectedAt" TIMESTAMP(3),
ALTER COLUMN "accessToken" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "SocialAccount_disconnectedAt_idx" ON "SocialAccount"("disconnectedAt");
