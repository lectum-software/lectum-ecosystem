-- CreateTable
CREATE TABLE "profile_view_events" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "psychologist_id" TEXT NOT NULL,
    "viewer_id" TEXT,
    "device_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'profile_page',

    CONSTRAINT "profile_view_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_shares" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "device_id" TEXT,
    "post_id" TEXT NOT NULL,
    "reply_id" TEXT,
    "target_type" TEXT NOT NULL DEFAULT 'post',
    "channel" TEXT NOT NULL DEFAULT 'web_share',

    CONSTRAINT "post_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_view_events_psychologist_id_created_at_idx" ON "profile_view_events"("psychologist_id", "created_at");

-- CreateIndex
CREATE INDEX "profile_view_events_viewer_id_created_at_idx" ON "profile_view_events"("viewer_id", "created_at");

-- CreateIndex
CREATE INDEX "profile_view_events_device_id_created_at_idx" ON "profile_view_events"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "post_shares_post_id_created_at_idx" ON "post_shares"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "post_shares_reply_id_created_at_idx" ON "post_shares"("reply_id", "created_at");

-- CreateIndex
CREATE INDEX "post_shares_user_id_created_at_idx" ON "post_shares"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "post_shares_device_id_created_at_idx" ON "post_shares"("device_id", "created_at");

-- AddForeignKey
ALTER TABLE "profile_view_events" ADD CONSTRAINT "profile_view_events_psychologist_id_fkey" FOREIGN KEY ("psychologist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_view_events" ADD CONSTRAINT "profile_view_events_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_shares" ADD CONSTRAINT "post_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_shares" ADD CONSTRAINT "post_shares_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_shares" ADD CONSTRAINT "post_shares_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "post_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
