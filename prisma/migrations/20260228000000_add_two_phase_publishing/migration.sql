-- AlterEnum
ALTER TYPE "PublicationStatus" ADD VALUE 'PREPARING' BEFORE 'PUBLISHING';
ALTER TYPE "PublicationStatus" ADD VALUE 'READY' BEFORE 'PUBLISHING';

-- AlterTable
ALTER TABLE "Publication" ADD COLUMN "containerId" TEXT;
