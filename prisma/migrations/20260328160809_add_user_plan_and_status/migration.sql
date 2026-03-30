-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('BETA', 'FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('WAITLISTED', 'ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plan" "UserPlan" NOT NULL DEFAULT 'BETA',
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "waitlist_entries" ADD COLUMN     "invitedAt" TIMESTAMPTZ(3);
