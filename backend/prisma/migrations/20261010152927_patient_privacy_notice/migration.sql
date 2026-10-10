-- DropIndex
DROP INDEX "notifications_user_id_seen_at_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "has_seen_patient_privacy_notice" BOOLEAN NOT NULL DEFAULT false;
