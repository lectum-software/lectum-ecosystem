-- Expand-only catalog operations; no changes to existing contracts, prices, offers or financial rows.
CREATE TABLE "billing_catalog_operations" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "actor_admin_id" TEXT NOT NULL,
    "request_key" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "interval_count" INTEGER NOT NULL DEFAULT 1,
    "lookup_key" TEXT NOT NULL,
    "provider_idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "version_id" TEXT,
    "external_price_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "first_attempt_at" TIMESTAMP(3),
    "lease_token" TEXT,
    "lease_until" TIMESTAMP(3),
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_catalog_operations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "billing_catalog_amount_policy" CHECK ("amount_cents" BETWEEN 50 AND 99999999),
    CONSTRAINT "billing_catalog_contract_policy" CHECK ("gateway" = 'stripe' AND "mode" IN ('test','live') AND "currency" = 'BRL' AND "interval" = 'month' AND "interval_count" = 1)
);
CREATE UNIQUE INDEX "billing_catalog_operations_lookup_key_key" ON "billing_catalog_operations"("lookup_key");
CREATE UNIQUE INDEX "billing_catalog_operations_provider_idempotency_key_key" ON "billing_catalog_operations"("provider_idempotency_key");
CREATE UNIQUE INDEX "billing_catalog_actor_request_key" ON "billing_catalog_operations"("actor_admin_id", "request_key");
CREATE INDEX "billing_catalog_scope_created_idx" ON "billing_catalog_operations"("gateway", "mode", "account_id", "plan_id", "created_at", "id");
