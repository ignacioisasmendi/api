/*
  Warnings:

  - You are about to drop the column `title` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the column `payload` on the `Publication` table. All the data in the column will be lost.
  - Added the required column `platform` to the `Publication` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'THUMBNAIL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentFormat" ADD VALUE 'CAROUSEL';
ALTER TYPE "ContentFormat" ADD VALUE 'ARTICLE';
ALTER TYPE "ContentFormat" ADD VALUE 'TWEET';

-- AlterEnum
ALTER TYPE "Platform" ADD VALUE 'LINKEDIN';

-- AlterTable
ALTER TABLE "Content" DROP COLUMN "title",
ADD COLUMN     "caption" TEXT;

-- AlterTable
ALTER TABLE "Publication" DROP COLUMN "payload",
ADD COLUMN     "customCaption" TEXT,
ADD COLUMN     "platform" "Platform" NOT NULL,
ADD COLUMN     "platformConfig" JSONB;

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "thumbnail" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationMedia" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "cropData" JSONB,

    CONSTRAINT "PublicationMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Media_contentId_idx" ON "Media"("contentId");

-- CreateIndex
CREATE INDEX "Media_type_idx" ON "Media"("type");

-- CreateIndex
CREATE INDEX "PublicationMedia_publicationId_idx" ON "PublicationMedia"("publicationId");

-- CreateIndex
CREATE INDEX "PublicationMedia_mediaId_idx" ON "PublicationMedia"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationMedia_publicationId_mediaId_key" ON "PublicationMedia"("publicationId", "mediaId");

-- CreateIndex
CREATE INDEX "Publication_contentId_idx" ON "Publication"("contentId");

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationMedia" ADD CONSTRAINT "PublicationMedia_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationMedia" ADD CONSTRAINT "PublicationMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
