-- CreateEnum
CREATE TYPE "DraftObjective" AS ENUM ('SELL', 'EDUCATE', 'ENTERTAIN', 'INFORM');

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "calendarId" TEXT,
    "title" TEXT NOT NULL,
    "date" TIMESTAMPTZ(3) NOT NULL,
    "contentType" "ContentFormat",
    "objective" "DraftObjective",
    "caption" TEXT,
    "notes" TEXT,
    "referenceUrl" TEXT,
    "referenceImageUrl" TEXT,
    "referenceImageKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Draft_clientId_idx" ON "Draft"("clientId");

-- CreateIndex
CREATE INDEX "Draft_calendarId_idx" ON "Draft"("calendarId");

-- CreateIndex
CREATE INDEX "Draft_date_idx" ON "Draft"("date");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
