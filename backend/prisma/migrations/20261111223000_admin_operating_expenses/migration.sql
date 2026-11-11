-- Expand-only manual cost records. No backfill, financial mutation, provider call or cascade.
CREATE TABLE "admin_operating_expenses" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "amount_cents" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "competence_date" DATE NOT NULL,
    "paid_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'active',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_by_admin_id" TEXT NOT NULL,
    "updated_by_admin_id" TEXT NOT NULL,
    "request_key" TEXT NOT NULL,
    "creation_fingerprint" TEXT NOT NULL,
    "correction_reason" TEXT,
    "void_reason" TEXT,
    "voided_at" TIMESTAMP(3),
    "voided_by_admin_id" TEXT,
    CONSTRAINT "admin_operating_expenses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "operating_expense_amount_currency_policy" CHECK ("currency" = 'BRL' AND "amount_cents" BETWEEN 1 AND 99999999),
    CONSTRAINT "operating_expense_category_policy" CHECK ("category" IN ('infrastructure','software','accounting','marketing','people','taxes','other')),
    CONSTRAINT "operating_expense_text_policy" CHECK (char_length("description") BETWEEN 3 AND 140 AND ("correction_reason" IS NULL OR char_length("correction_reason") BETWEEN 8 AND 240)),
    CONSTRAINT "operating_expense_date_policy" CHECK ("competence_date" BETWEEN DATE '2000-01-01' AND DATE '2100-12-31' AND ("paid_date" IS NULL OR ("paid_date" BETWEEN DATE '2000-01-01' AND DATE '2100-12-31' AND "paid_date" <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date))),
    CONSTRAINT "operating_expense_revision_policy" CHECK ("revision" >= 1),
    CONSTRAINT "operating_expense_void_policy" CHECK (("status" = 'active' AND "void_reason" IS NULL AND "voided_at" IS NULL AND "voided_by_admin_id" IS NULL) OR ("status" = 'voided' AND "void_reason" IS NOT NULL AND char_length("void_reason") BETWEEN 8 AND 240 AND "voided_at" IS NOT NULL AND "voided_by_admin_id" IS NOT NULL))
);
CREATE UNIQUE INDEX "operating_expense_actor_request_key" ON "admin_operating_expenses"("created_by_admin_id", "request_key");
CREATE INDEX "operating_expense_competence_order_idx" ON "admin_operating_expenses"("competence_date", "created_at", "id");
CREATE INDEX "operating_expense_status_competence_idx" ON "admin_operating_expenses"("status", "competence_date");
CREATE INDEX "operating_expense_category_competence_idx" ON "admin_operating_expenses"("category", "competence_date");
