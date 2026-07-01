-- AlterTable
ALTER TABLE "users" ADD COLUMN     "has_seen_psychologist_profile_video_tip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_seen_psychologist_reply_tip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_seen_psychologist_original_post_tip" BOOLEAN NOT NULL DEFAULT false;
