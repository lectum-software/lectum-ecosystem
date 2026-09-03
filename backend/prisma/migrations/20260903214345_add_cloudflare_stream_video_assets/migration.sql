-- CreateTable
CREATE TABLE "video_assets" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'cloudflare_stream',
    "provider_uid" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "context_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "duration_seconds" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "upload_expires_at" TIMESTAMP(3) NOT NULL,
    "last_provider_sync_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "error_code" TEXT,
    "last_webhook_at" TIMESTAMP(3),
    "last_webhook_digest" TEXT,

    CONSTRAINT "video_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_assets_provider_uid_key" ON "video_assets"("provider_uid");

-- CreateIndex
CREATE INDEX "video_assets_owner_id_purpose_deleted_created_at_idx" ON "video_assets"("owner_id", "purpose", "deleted", "created_at");

-- CreateIndex
CREATE INDEX "video_assets_status_deleted_updated_at_idx" ON "video_assets"("status", "deleted", "updated_at");

-- CreateIndex
CREATE INDEX "video_assets_context_id_purpose_deleted_idx" ON "video_assets"("context_id", "purpose", "deleted");

-- AddForeignKey
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
