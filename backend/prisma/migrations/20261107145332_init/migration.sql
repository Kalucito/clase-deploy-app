-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pendiente', 'en_progreso', 'en_revision', 'hecho');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('baja', 'media', 'alta');

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "status" "TaskStatus" NOT NULL DEFAULT 'pendiente',
    "priority" "Priority" NOT NULL DEFAULT 'media',
    "dueDate" DATE,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labels" (
    "id" UUID NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "normalizedName" VARCHAR(20) NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LabelToTask" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_LabelToTask_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "tasks_status_position_idx" ON "tasks"("status", "position");

-- CreateIndex
CREATE UNIQUE INDEX "labels_normalizedName_key" ON "labels"("normalizedName");

-- CreateIndex
CREATE INDEX "_LabelToTask_B_index" ON "_LabelToTask"("B");

-- AddForeignKey
ALTER TABLE "_LabelToTask" ADD CONSTRAINT "_LabelToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LabelToTask" ADD CONSTRAINT "_LabelToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restricciones de integridad que Prisma no expresa (spec §8, plan §4.2).
-- No eliminar al regenerar migraciones.
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_title_not_blank" CHECK (char_length(btrim("title")) >= 1);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_position_non_negative" CHECK ("position" >= 0);
