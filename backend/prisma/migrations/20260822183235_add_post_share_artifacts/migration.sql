-- CreateTable
CREATE TABLE "post_share_artifacts" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cache_key" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "reply_id" TEXT,
    "target_type" TEXT NOT NULL,
    "source_media_url" TEXT NOT NULL,
    "source_fingerprint" TEXT NOT NULL,
    "layout_version" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_share_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_share_artifacts_cache_key_key" ON "post_share_artifacts"("cache_key");

-- CreateIndex
CREATE INDEX "post_share_artifacts_post_id_expires_at_idx" ON "post_share_artifacts"("post_id", "expires_at");

-- CreateIndex
CREATE INDEX "post_share_artifacts_reply_id_expires_at_idx" ON "post_share_artifacts"("reply_id", "expires_at");

-- CreateIndex
CREATE INDEX "post_share_artifacts_expires_at_idx" ON "post_share_artifacts"("expires_at");

-- CreateIndex
CREATE INDEX "post_share_artifacts_storage_key_idx" ON "post_share_artifacts"("storage_key");

-- AddForeignKey
ALTER TABLE "post_share_artifacts" ADD CONSTRAINT "post_share_artifacts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_share_artifacts" ADD CONSTRAINT "post_share_artifacts_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "post_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "professional_subscriptions_billing_last_notice_key_billing_grac" RENAME TO "professional_subscriptions_billing_last_notice_key_billing__idx";
