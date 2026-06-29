-- AlterTable
ALTER TABLE "users" ADD COLUMN     "has_seen_psychologist_whatsapp_tip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_seen_psychologists_my_search_tip" BOOLEAN NOT NULL DEFAULT false;
