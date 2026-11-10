-- AlterTable
ALTER TABLE "billing_operations" ADD COLUMN     "confirmation_fingerprint" TEXT,
ADD COLUMN     "confirmation_sequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parent_operation_id" TEXT,
ADD COLUMN     "provider_invoice_id" TEXT,
ADD COLUMN     "provider_payment_method_id" TEXT,
ADD COLUMN     "provider_setup_intent_id" TEXT;

-- AlterTable
ALTER TABLE "professional_subscriptions" ADD COLUMN     "collection_policy" TEXT;

-- CreateIndex
CREATE INDEX "billing_operations_parent_operation_id_kind_idx" ON "billing_operations"("parent_operation_id", "kind");

-- CreateIndex
CREATE INDEX "billing_operations_provider_invoice_id_gateway_mode_account_idx" ON "billing_operations"("provider_invoice_id", "gateway", "mode", "account_id");
