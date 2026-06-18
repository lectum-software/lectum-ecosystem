-- CreateTable
CREATE TABLE "profile_video_watch_sessions" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "psychologist_id" TEXT NOT NULL,
    "viewer_id" TEXT,
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
    "last_event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_video_watch_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_video_watch_sessions_psychologist_id_created_at_idx" ON "profile_video_watch_sessions"("psychologist_id", "created_at");

-- CreateIndex
CREATE INDEX "profile_video_watch_sessions_psychologist_id_last_event_at_idx" ON "profile_video_watch_sessions"("psychologist_id", "last_event_at");

-- CreateIndex
CREATE INDEX "profile_video_watch_sessions_viewer_id_created_at_idx" ON "profile_video_watch_sessions"("viewer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "profile_video_watch_sessions_psychologist_id_session_key_key" ON "profile_video_watch_sessions"("psychologist_id", "session_key");

-- AddForeignKey
ALTER TABLE "profile_video_watch_sessions" ADD CONSTRAINT "profile_video_watch_sessions_psychologist_id_fkey" FOREIGN KEY ("psychologist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_video_watch_sessions" ADD CONSTRAINT "profile_video_watch_sessions_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
