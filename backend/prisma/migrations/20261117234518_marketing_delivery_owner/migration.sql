-- AlterTable
ALTER TABLE "marketing_delivery_jobs" ADD COLUMN     "consent_revision" INTEGER,
ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "marketing_delivery_jobs_user_id_idx" ON "marketing_delivery_jobs"("user_id");

-- AddForeignKey
ALTER TABLE "marketing_delivery_jobs" ADD CONSTRAINT "marketing_delivery_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
