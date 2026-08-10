-- CreateTable
CREATE TABLE "community_suggestion_blocks" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'monitorando',
    "created_by_admin_id" TEXT,
    "community_id" TEXT,

    CONSTRAINT "community_suggestion_blocks_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "community_suggestions" ADD COLUMN "block_id" TEXT;

-- CreateIndex
CREATE INDEX "community_suggestion_blocks_status_deleted_idx" ON "community_suggestion_blocks"("status", "deleted");

-- CreateIndex
CREATE INDEX "community_suggestion_blocks_created_by_admin_id_idx" ON "community_suggestion_blocks"("created_by_admin_id");

-- CreateIndex
CREATE INDEX "community_suggestion_blocks_community_id_idx" ON "community_suggestion_blocks"("community_id");

-- CreateIndex
CREATE INDEX "community_suggestions_block_id_idx" ON "community_suggestions"("block_id");

-- CreateIndex
CREATE INDEX "community_suggestions_status_block_id_idx" ON "community_suggestions"("status", "block_id");

-- AddForeignKey
ALTER TABLE "community_suggestion_blocks" ADD CONSTRAINT "community_suggestion_blocks_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_suggestion_blocks" ADD CONSTRAINT "community_suggestion_blocks_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_suggestions" ADD CONSTRAINT "community_suggestions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "community_suggestion_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
