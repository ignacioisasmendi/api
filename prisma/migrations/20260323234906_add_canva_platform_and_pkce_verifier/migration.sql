-- AlterEnum
ALTER TYPE "Platform" ADD VALUE 'CANVA';

-- AlterTable
ALTER TABLE "OAuthState" ADD COLUMN     "codeVerifier" TEXT;
