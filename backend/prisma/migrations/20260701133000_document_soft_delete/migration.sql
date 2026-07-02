-- AlterTable
ALTER TABLE "documents" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "documents_userId_deletedAt_createdAt_id_idx"
ON "documents"("userId", "deletedAt", "createdAt", "id");
