-- Add numeric internal identifiers for finance admin reconciliation without changing string primary keys.
-- Existing rows receive sequence-backed values and future rows auto-increment independently per table.

-- AlterTable
ALTER TABLE "professional_subscriptions" ADD COLUMN "internal_id" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "payment_events" ADD COLUMN "internal_id" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "professional_subscriptions_internal_id_key" ON "professional_subscriptions"("internal_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_internal_id_key" ON "payment_events"("internal_id");