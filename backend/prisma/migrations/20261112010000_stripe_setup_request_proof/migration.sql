-- Additive proof only. Legacy inbox rows remain NULL until the exact signed event is delivered again.
ALTER TABLE "billing_gateway_events" ADD COLUMN "request_idempotency_key_hash" TEXT;
ALTER TABLE "billing_gateway_events" ADD CONSTRAINT "stripe_event_request_key_hash_policy"
  CHECK ("request_idempotency_key_hash" IS NULL OR "request_idempotency_key_hash" ~ '^[a-f0-9]{64}$');
