-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "seen_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "notifications_user_id_seen_at_idx" ON "notifications"("user_id", "seen_at");