-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "kanbanColumnId" TEXT,
ADD COLUMN     "kanbanOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "KanbanColumn" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "mappedStatus" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "KanbanColumn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanbanColumn_calendarId_idx" ON "KanbanColumn"("calendarId");

-- CreateIndex
CREATE INDEX "KanbanColumn_calendarId_order_idx" ON "KanbanColumn"("calendarId", "order");

-- CreateIndex
CREATE INDEX "Publication_kanbanColumnId_idx" ON "Publication"("kanbanColumnId");

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_kanbanColumnId_fkey" FOREIGN KEY ("kanbanColumnId") REFERENCES "KanbanColumn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanColumn" ADD CONSTRAINT "KanbanColumn_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
