-- AlterTable
ALTER TABLE "billing_invoice_jobs" ADD COLUMN     "verification_failures" INTEGER NOT NULL DEFAULT 0;
