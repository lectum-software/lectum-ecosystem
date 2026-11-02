CREATE TABLE "account_media_deletions" (
    "id" TEXT NOT NULL,
    "identity_hash" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "storage_namespace" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_media_deletions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "account_media_deletions_identity_hash_key" ON "account_media_deletions"("identity_hash");
CREATE INDEX "account_media_deletions_completed_at_available_at_idx" ON "account_media_deletions"("completed_at", "available_at");
CREATE INDEX "account_media_deletions_owner_id_idx" ON "account_media_deletions"("owner_id");
