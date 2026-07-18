-- CreateTable
CREATE TABLE "content_video_watch_sessions" (
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
    "viewer_id" TEXT,
    "visitor_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "session_key" TEXT NOT NULL,
    "video_url" TEXT,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "watched_seconds" INTEGER NOT NULL DEFAULT 0,
    "max_position_seconds" INTEGER NOT NULL DEFAULT 0,
    "replay_count" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "milestone_25" BOOLEAN NOT NULL DEFAULT false,
    "milestone_50" BOOLEAN NOT NULL DEFAULT false,
    "milestone_75" BOOLEAN NOT NULL DEFAULT false,
    "milestone_100" BOOLEAN NOT NULL DEFAULT false,
    "retention_buckets" JSONB,
    "last_event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_video_watch_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_video_watch_sessions_target_type_target_id_created__idx" ON "content_video_watch_sessions"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "content_video_watch_sessions_community_id_created_at_idx" ON "content_video_watch_sessions"("community_id", "created_at");

-- CreateIndex
CREATE INDEX "content_video_watch_sessions_viewer_id_created_at_idx" ON "content_video_watch_sessions"("viewer_id", "created_at");

-- CreateIndex
CREATE INDEX "content_video_watch_sessions_post_id_created_at_idx" ON "content_video_watch_sessions"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "content_video_watch_sessions_reply_id_created_at_idx" ON "content_video_watch_sessions"("reply_id", "created_at");

-- CreateIndex
CREATE INDEX "content_video_watch_sessions_last_event_at_idx" ON "content_video_watch_sessions"("last_event_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_video_watch_sessions_target_type_target_id_session__key" ON "content_video_watch_sessions"("target_type", "target_id", "session_key");

-- AddForeignKey
ALTER TABLE "content_video_watch_sessions" ADD CONSTRAINT "content_video_watch_sessions_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_video_watch_sessions" ADD CONSTRAINT "content_video_watch_sessions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_video_watch_sessions" ADD CONSTRAINT "content_video_watch_sessions_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "post_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_video_watch_sessions" ADD CONSTRAINT "content_video_watch_sessions_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
