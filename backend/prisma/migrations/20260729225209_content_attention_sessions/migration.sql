-- CreateTable
CREATE TABLE "content_attention_sessions" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "post_id" TEXT,
    "reply_id" TEXT,
    "community_id" TEXT NOT NULL,
    "psychologist_id" TEXT NOT NULL,
    "viewer_id" TEXT,
    "visitor_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "session_key" TEXT NOT NULL,
    "source_path" TEXT,
    "attention_seconds" INTEGER NOT NULL DEFAULT 0,
    "last_event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_attention_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_attention_sessions_target_type_target_id_created_at_idx" ON "content_attention_sessions"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "content_attention_sessions_community_id_created_at_idx" ON "content_attention_sessions"("community_id", "created_at");

-- CreateIndex
CREATE INDEX "content_attention_sessions_psychologist_id_created_at_idx" ON "content_attention_sessions"("psychologist_id", "created_at");

-- CreateIndex
CREATE INDEX "content_attention_sessions_viewer_id_created_at_idx" ON "content_attention_sessions"("viewer_id", "created_at");

-- CreateIndex
CREATE INDEX "content_attention_sessions_post_id_created_at_idx" ON "content_attention_sessions"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "content_attention_sessions_reply_id_created_at_idx" ON "content_attention_sessions"("reply_id", "created_at");

-- CreateIndex
CREATE INDEX "content_attention_sessions_last_event_at_idx" ON "content_attention_sessions"("last_event_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_attention_sessions_target_type_target_id_session_ke_key" ON "content_attention_sessions"("target_type", "target_id", "session_key");

-- AddForeignKey
ALTER TABLE "content_attention_sessions" ADD CONSTRAINT "content_attention_sessions_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_attention_sessions" ADD CONSTRAINT "content_attention_sessions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_attention_sessions" ADD CONSTRAINT "content_attention_sessions_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "post_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_attention_sessions" ADD CONSTRAINT "content_attention_sessions_psychologist_id_fkey" FOREIGN KEY ("psychologist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_attention_sessions" ADD CONSTRAINT "content_attention_sessions_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
