-- AlterTable
ALTER TABLE "professional_subscriptions" ADD COLUMN     "grant_notes" TEXT,
ADD COLUMN     "grant_reason" TEXT,
ADD COLUMN     "grant_started_at" TIMESTAMP(3),
ADD COLUMN     "granted_by" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'legacy';

-- CreateIndex
CREATE INDEX "professional_subscriptions_source_status_idx" ON "professional_subscriptions"("source", "status");

-- CreateIndex
CREATE INDEX "professional_subscriptions_status_current_period_end_idx" ON "professional_subscriptions"("status", "current_period_end");
