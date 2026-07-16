-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deactivated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "communities_slug_active_deleted_idx" ON "communities"("slug", "active", "deleted");

-- CreateIndex
CREATE INDEX "communities_active_deleted_idx" ON "communities"("active", "deleted");
