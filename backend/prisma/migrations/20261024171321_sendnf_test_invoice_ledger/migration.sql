-- CreateTable
CREATE TABLE "billing_invoice_jobs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token" TEXT,
    "lease_until" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_error_code" TEXT,

    CONSTRAINT "billing_invoice_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gateway" TEXT NOT NULL DEFAULT 'mercadopago',
    "payment_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'test',
    "subscription_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "paid_at" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "request_snapshot" JSONB NOT NULL,
    "document_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "number" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token" TEXT,
    "lease_until" TIMESTAMP(3),
    "last_error_code" TEXT,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_invoice_jobs_completed_at_next_attempt_at_lease_unt_idx" ON "billing_invoice_jobs"("completed_at", "next_attempt_at", "lease_until");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoice_jobs_resource_type_resource_id_key" ON "billing_invoice_jobs"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoices_reference_key" ON "billing_invoices"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoices_document_id_key" ON "billing_invoices"("document_id");

-- CreateIndex
CREATE INDEX "billing_invoices_user_id_paid_at_idx" ON "billing_invoices"("user_id", "paid_at");

-- CreateIndex
CREATE INDEX "billing_invoices_next_attempt_at_lease_until_idx" ON "billing_invoices"("next_attempt_at", "lease_until");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoices_gateway_payment_id_mode_key" ON "billing_invoices"("gateway", "payment_id", "mode");
