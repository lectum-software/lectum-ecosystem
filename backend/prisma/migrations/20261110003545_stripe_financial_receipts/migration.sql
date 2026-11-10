-- Expand-only foundation. No existing payment, fiscal, customer or subscription rows are changed.
CREATE TABLE "billing_financial_receipts" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "psychologist_id" TEXT NOT NULL,
    "provider_subscription_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "invoice_payment_id" TEXT NOT NULL,
    "payment_intent_id" TEXT NOT NULL,
    "charge_id" TEXT NOT NULL,
    "price_id" TEXT NOT NULL,
    "price_version_id" TEXT,
    "currency" TEXT NOT NULL,
    "amount_paid_cents" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "invoice_paid_at" TIMESTAMP(3) NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "immutable_hash" TEXT NOT NULL,
    "current_state" TEXT NOT NULL,
    "refunded_cents" INTEGER NOT NULL DEFAULT 0,
    "dispute_status" TEXT NOT NULL DEFAULT 'none',
    "observed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_financial_receipts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "financial_receipt_amount_check" CHECK ("amount_paid_cents" > 0 AND "refunded_cents" >= 0 AND "refunded_cents" <= "amount_paid_cents"),
    CONSTRAINT "financial_receipt_period_check" CHECK ("period_end" > "period_start" AND "invoice_paid_at" >= "paid_at")
);

CREATE TABLE "billing_financial_reconciliations" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "psychologist_id" TEXT NOT NULL,
    "provider_subscription_id" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "requested_revision" INTEGER NOT NULL DEFAULT 1,
    "processed_revision" INTEGER NOT NULL DEFAULT 0,
    "cursor" TEXT,
    "scan_started_at" TIMESTAMP(3),
    "covered_from" TIMESTAMP(3),
    "covered_through" TIMESTAMP(3),
    "receipts_complete" BOOLEAN NOT NULL DEFAULT false,
    "periods_complete" BOOLEAN NOT NULL DEFAULT false,
    "adjustments_complete" BOOLEAN NOT NULL DEFAULT false,
    "invoice_count" INTEGER NOT NULL DEFAULT 0,
    "receipt_count" INTEGER NOT NULL DEFAULT 0,
    "excluded_count" INTEGER NOT NULL DEFAULT 0,
    "last_event_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lease_token" TEXT,
    "lease_until" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_financial_reconciliations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_receipt_invoice_payment_key" ON "billing_financial_receipts"("gateway", "mode", "account_id", "invoice_id", "invoice_payment_id");
CREATE UNIQUE INDEX "financial_receipt_payment_scope_key" ON "billing_financial_receipts"("gateway", "mode", "account_id", "invoice_payment_id");
CREATE INDEX "financial_receipt_subscription_paid_idx" ON "billing_financial_receipts"("gateway", "mode", "account_id", "subscription_id", "paid_at");
CREATE INDEX "financial_receipt_charge_idx" ON "billing_financial_receipts"("gateway", "mode", "account_id", "charge_id");
CREATE UNIQUE INDEX "financial_reconciliation_subscription_key" ON "billing_financial_reconciliations"("gateway", "mode", "account_id", "subscription_id");
CREATE INDEX "financial_reconciliation_due_idx" ON "billing_financial_reconciliations"("state", "next_attempt_at", "lease_until");
CREATE INDEX "financial_reconciliation_provider_idx" ON "billing_financial_reconciliations"("gateway", "mode", "account_id", "provider_subscription_id");
