-- DropIndex
DROP INDEX "post_reports_post_id_reporter_id_key";

-- AlterTable
ALTER TABLE "post_reports" ADD COLUMN     "reply_id" TEXT;

-- CreateIndex
CREATE INDEX "post_reports_post_id_reply_id_reporter_id_idx" ON "post_reports"("post_id", "reply_id", "reporter_id");

-- AddForeignKey
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "post_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
