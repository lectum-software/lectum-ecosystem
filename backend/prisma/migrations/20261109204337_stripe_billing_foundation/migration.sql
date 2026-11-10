-- Expansion only; no historical prices are inferred.
ALTER TABLE "payment_methods" ADD COLUMN "gateway_mode" TEXT, ADD COLUMN "gateway_account_id" TEXT;
ALTER TABLE "billing_invoices" ADD COLUMN "account_id" TEXT;

-- AlterTable
ALTER TABLE "billing_invoice_jobs" ADD COLUMN     "account_id" TEXT,
ADD COLUMN     "gateway" TEXT NOT NULL DEFAULT 'mercadopago',
ADD COLUMN     "mode" TEXT,
ADD COLUMN     "provider_resource_id" TEXT;

-- AlterTable
ALTER TABLE "professional_subscriptions" ADD COLUMN     "contracted_amount_cents" INTEGER,
ADD COLUMN     "contracted_currency" TEXT,
ADD COLUMN     "contracted_interval" TEXT,
ADD COLUMN     "contracted_interval_count" INTEGER,
ADD COLUMN     "gateway_account_id" TEXT,
ADD COLUMN     "gateway_mode" TEXT,
ADD COLUMN     "price_version_id" TEXT;

-- CreateTable
CREATE TABLE "billing_price_versions" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "external_product_id" TEXT NOT NULL,
    "external_price_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "interval_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_price_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_offers" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "price_version_id" TEXT NOT NULL,
    "checkout_enabled" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "external_customer_id" TEXT,
    "state" TEXT NOT NULL DEFAULT 'reserved',
    "lease_token" TEXT,
    "lease_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_operations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "psychologist_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "customer_id" TEXT,
    "price_version_id" TEXT,
    "gateway" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "intent" TEXT,
    "request_key" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'reserved',
    "quote_revision" TEXT,
    "scheduled_start_at" TIMESTAMP(3),
    "provider_subscription_id" TEXT,
    "provider_intent_id" TEXT,
    "intent_kind" TEXT,
    "lease_token" TEXT,
    "lease_until" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "billing_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_gateway_events" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "gateway_created_at" TIMESTAMP(3) NOT NULL,
    "provider_subscription_id" TEXT,
    "api_version" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "state" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token" TEXT,
    "lease_until" TIMESTAMP(3),
    "last_error_code" TEXT,

    CONSTRAINT "billing_gateway_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_price_versions_plan_id_gateway_mode_idx" ON "billing_price_versions"("plan_id", "gateway", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "billing_price_versions_gateway_mode_account_id_external_pri_key" ON "billing_price_versions"("gateway", "mode", "account_id", "external_price_id");

-- CreateIndex
CREATE INDEX "billing_offers_price_version_id_idx" ON "billing_offers"("price_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_offers_plan_id_gateway_mode_key" ON "billing_offers"("plan_id", "gateway", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_user_id_gateway_mode_account_id_key" ON "billing_customers"("user_id", "gateway", "mode", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_gateway_mode_account_id_external_customer_key" ON "billing_customers"("gateway", "mode", "account_id", "external_customer_id");

-- CreateIndex
CREATE INDEX "billing_operations_user_id_gateway_mode_state_idx" ON "billing_operations"("user_id", "gateway", "mode", "state");

-- CreateIndex
CREATE INDEX "billing_operations_subscription_id_idx" ON "billing_operations"("subscription_id");

-- CreateIndex
CREATE INDEX "billing_operations_provider_subscription_id_gateway_mode_ac_idx" ON "billing_operations"("provider_subscription_id", "gateway", "mode", "account_id");

-- CreateIndex
CREATE INDEX "billing_operations_next_attempt_at_lease_until_idx" ON "billing_operations"("next_attempt_at", "lease_until");

-- CreateIndex
CREATE UNIQUE INDEX "billing_operations_user_id_gateway_mode_account_id_request__key" ON "billing_operations"("user_id", "gateway", "mode", "account_id", "request_key");

-- CreateIndex
CREATE INDEX "billing_gateway_events_state_next_attempt_at_lease_until_idx" ON "billing_gateway_events"("state", "next_attempt_at", "lease_until");

-- CreateIndex
CREATE UNIQUE INDEX "billing_gateway_events_gateway_mode_account_id_external_id_key" ON "billing_gateway_events"("gateway", "mode", "account_id", "external_id");

-- Database backstop for retries across tabs/processes. Ambiguous operations stay open.
CREATE UNIQUE INDEX "billing_operations_one_open_checkout"
ON "billing_operations" ("user_id", "gateway", "mode", "account_id")
WHERE "kind" = 'checkout' AND "state" IN
('reserved', 'creating', 'requires_confirmation', 'processing', 'review_required');

CREATE UNIQUE INDEX "billing_operations_one_open_card_update"
ON "billing_operations" ("user_id", "subscription_id", "gateway", "mode", "account_id")
WHERE "kind" = 'payment_method' AND "state" IN
('reserved', 'creating', 'requires_confirmation', 'processing', 'review_required');
