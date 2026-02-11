/*
  Warnings:

  - You are about to drop the column `connectedAt` on the `SocialAccount` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SocialAccount" DROP COLUMN "connectedAt",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
