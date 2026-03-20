-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "done" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "blockedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistItem_taskId_idx" ON "ChecklistItem"("taskId");

-- CreateIndex
CREATE INDEX "TaskDependency_taskId_idx" ON "TaskDependency"("taskId");

-- CreateIndex
CREATE INDEX "TaskDependency_blockedById_idx" ON "TaskDependency"("blockedById");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_taskId_blockedById_key" ON "TaskDependency"("taskId", "blockedById");

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
