-- Expand-only: canonical GET observations. No change to existing financial or fiscal records.
CREATE TABLE "billing_stripe_balance_facts" (
 "id" TEXT NOT NULL, "gateway" TEXT NOT NULL, "mode" TEXT NOT NULL, "account_id" TEXT NOT NULL,
 "receipt_id" TEXT NOT NULL, "receipt_immutable_hash" TEXT NOT NULL,
 "provider_transaction_id" TEXT NOT NULL, "kind" TEXT NOT NULL, "source_id" TEXT NOT NULL,
 "charge_id" TEXT NOT NULL, "currency" TEXT NOT NULL,
 "amount_cents" BIGINT NOT NULL, "fee_cents" BIGINT NOT NULL, "net_cents" BIGINT NOT NULL,
 "provider_created_at" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL,
 "available_on" TIMESTAMP(3) NOT NULL, "immutable_hash" TEXT NOT NULL,
 "observed_at" TIMESTAMP(3) NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "billing_stripe_balance_facts_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "stripe_balance_fact_scope_policy" CHECK ("gateway"='stripe' AND "mode" IN ('test','live') AND "currency"='BRL'),
 CONSTRAINT "stripe_balance_fact_kind_policy" CHECK ("kind" IN ('capture','refund','refund_reversal','dispute')),
 CONSTRAINT "stripe_balance_fact_arithmetic" CHECK ("net_cents"::numeric="amount_cents"::numeric-"fee_cents"::numeric),
 CONSTRAINT "stripe_balance_fact_status_policy" CHECK ("status" IN ('pending','available'))
);
CREATE UNIQUE INDEX "stripe_balance_fact_transaction_scope_key" ON "billing_stripe_balance_facts"("gateway","mode","account_id","provider_transaction_id");
CREATE INDEX "stripe_balance_fact_receipt_idx" ON "billing_stripe_balance_facts"("receipt_id","gateway","mode","account_id","provider_created_at");
CREATE TABLE "billing_stripe_fee_observations" (
 "id" TEXT NOT NULL,"gateway" TEXT NOT NULL,"mode" TEXT NOT NULL,"account_id" TEXT NOT NULL,
 "receipt_id" TEXT NOT NULL,"receipt_hash" TEXT NOT NULL,"state" TEXT NOT NULL DEFAULT 'not_observed',
 "stage" TEXT NOT NULL DEFAULT 'capture',"revision" INTEGER NOT NULL DEFAULT 1,
 "lease_token" TEXT,"lease_until" TIMESTAMP(3),"cutoff" TIMESTAMP(3) NOT NULL,
 "capture_verified" BOOLEAN NOT NULL DEFAULT false,"refunds_cursor" TEXT,"disputes_cursor" TEXT,
 "refunds_scanned" BOOLEAN NOT NULL DEFAULT false,"disputes_scanned" BOOLEAN NOT NULL DEFAULT false,
 "refunds_gap" BOOLEAN NOT NULL DEFAULT false,"disputes_gap" BOOLEAN NOT NULL DEFAULT false,
 "last_error_code" TEXT,"observed_at" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "billing_stripe_fee_observations_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "stripe_fee_observation_scope_policy" CHECK ("gateway"='stripe' AND "mode" IN ('test','live')),
 CONSTRAINT "stripe_fee_observation_state_policy" CHECK ("state" IN ('not_observed','processing','partial','observed','unavailable','conflict') AND "stage" IN ('capture','refunds','disputes','complete') AND "revision">=1)
);
CREATE UNIQUE INDEX "stripe_fee_observation_receipt_scope_key" ON "billing_stripe_fee_observations"("gateway","mode","account_id","receipt_id");
CREATE INDEX "stripe_fee_observation_receipt_idx" ON "billing_stripe_fee_observations"("receipt_id");
