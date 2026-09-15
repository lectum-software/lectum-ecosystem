ALTER TABLE "professional_subscriptions"
  ADD COLUMN "billing_issue_started_at" TIMESTAMP(3),
  ADD COLUMN "billing_grace_ends_at" TIMESTAMP(3),
  ADD COLUMN "billing_downgraded_at" TIMESTAMP(3),
  ADD COLUMN "billing_last_notice_key" TEXT;

CREATE INDEX "professional_subscriptions_status_billing_grace_ends_at_idx"
  ON "professional_subscriptions"("status", "billing_grace_ends_at");

CREATE INDEX "professional_subscriptions_billing_last_notice_key_billing_grace_ends_at_idx"
  ON "professional_subscriptions"("billing_last_notice_key", "billing_grace_ends_at");
