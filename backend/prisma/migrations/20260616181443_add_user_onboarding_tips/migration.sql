-- AlterTable
ALTER TABLE "users" ADD COLUMN     "has_seen_community_post_tip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_seen_discover_psychologists_tip" BOOLEAN NOT NULL DEFAULT false;
