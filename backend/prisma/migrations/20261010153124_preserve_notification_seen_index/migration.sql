-- CreateIndex
CREATE INDEX "notifications_user_id_seen_at_idx" ON "notifications"("user_id", "seen_at");
