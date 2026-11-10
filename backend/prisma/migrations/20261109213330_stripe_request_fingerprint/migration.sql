-- AlterTable
ALTER TABLE "billing_customers" ADD COLUMN     "request_fingerprint" TEXT;

-- AlterTable
ALTER TABLE "billing_operations" ADD COLUMN     "request_fingerprint" TEXT;
