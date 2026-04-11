-- CreateTable
CREATE TABLE "waitlist_invite_sends" (
    "id" TEXT NOT NULL,
    "waitlistEntryId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_invite_sends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_invite_sends_waitlistEntryId_idx" ON "waitlist_invite_sends"("waitlistEntryId");

-- CreateIndex
CREATE INDEX "waitlist_invite_sends_sentAt_idx" ON "waitlist_invite_sends"("sentAt" DESC);

-- AddForeignKey
ALTER TABLE "waitlist_invite_sends" ADD CONSTRAINT "waitlist_invite_sends_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "waitlist_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
