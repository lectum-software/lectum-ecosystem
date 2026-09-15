-- CreateTable
CREATE TABLE "video_retention_records" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "identity_hash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "storage_namespace" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "retained_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "review_after" TIMESTAMP(3),
    "deletion_hold" BOOLEAN NOT NULL DEFAULT true,
    "size_bytes" BIGINT,
    "source_etag" TEXT,

    CONSTRAINT "video_retention_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_retention_records_identity_hash_key" ON "video_retention_records"("identity_hash");

-- CreateIndex
CREATE INDEX "video_retention_records_provider_deletion_hold_review_after_idx" ON "video_retention_records"("provider", "deletion_hold", "review_after");

-- CreateIndex
CREATE INDEX "video_retention_records_deleted_retained_at_id_idx" ON "video_retention_records"("deleted", "retained_at", "id");
