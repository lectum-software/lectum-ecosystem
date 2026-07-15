-- CreateTable
CREATE TABLE "content_moderation_events" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "community_id" TEXT,
    "author_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "categories" JSONB NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason_code" TEXT NOT NULL,
    "matched_rules" JSONB,
    "title_snapshot" TEXT,
    "content_excerpt" TEXT NOT NULL,
    "content_snapshot" TEXT,
    "reviewed_by_admin_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "admin_note" TEXT,

    CONSTRAINT "content_moderation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_moderation_events_status_severity_created_at_idx" ON "content_moderation_events"("status", "severity", "created_at");

-- CreateIndex
CREATE INDEX "content_moderation_events_decision_created_at_idx" ON "content_moderation_events"("decision", "created_at");

-- CreateIndex
CREATE INDEX "content_moderation_events_target_type_target_id_idx" ON "content_moderation_events"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "content_moderation_events_community_id_created_at_idx" ON "content_moderation_events"("community_id", "created_at");

-- CreateIndex
CREATE INDEX "content_moderation_events_author_id_created_at_idx" ON "content_moderation_events"("author_id", "created_at");

-- AddForeignKey
ALTER TABLE "content_moderation_events" ADD CONSTRAINT "content_moderation_events_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_moderation_events" ADD CONSTRAINT "content_moderation_events_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_moderation_events" ADD CONSTRAINT "content_moderation_events_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
