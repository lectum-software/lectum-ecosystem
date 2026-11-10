-- Keep both canonical payment timestamps unchanged. Stripe does not guarantee
-- ordering between invoice and InvoicePayment state transitions.
-- Only relax the invalid cross-object ordering assumption; preserve valid periods.
BEGIN;
ALTER TABLE "billing_financial_receipts"
  DROP CONSTRAINT "financial_receipt_period_check",
  ADD CONSTRAINT "financial_receipt_period_check" CHECK ("period_end" > "period_start");
COMMIT;
