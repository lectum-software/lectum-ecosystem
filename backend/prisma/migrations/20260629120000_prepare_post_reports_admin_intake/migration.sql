-- AlterTable
ALTER TABLE "post_reports" ADD COLUMN "target_type" TEXT NOT NULL DEFAULT 'post';
ALTER TABLE "post_reports" ADD COLUMN "target_id" TEXT;

-- Backfill target keys for reports created before the admin-ready intake fields.
UPDATE "post_reports"
SET "target_type" = CASE WHEN "reply_id" IS NULL THEN 'post' ELSE 'reply' END,
    "target_id" = COALESCE("reply_id", "post_id")
WHERE "target_id" IS NULL;

ALTER TABLE "post_reports" ALTER COLUMN "target_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "post_reports_target_type_target_id_reporter_id_key" ON "post_reports"("target_type", "target_id", "reporter_id");

-- CreateIndex
CREATE INDEX "post_reports_target_type_target_id_status_idx" ON "post_reports"("target_type", "target_id", "status");
