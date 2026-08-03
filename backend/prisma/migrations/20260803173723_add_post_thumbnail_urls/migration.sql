-- AlterTable
ALTER TABLE "community_post_media" ADD COLUMN     "thumbnail_url" TEXT;

-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "thumbnail_url" TEXT;

-- AlterTable
ALTER TABLE "post_replies" ADD COLUMN     "thumbnail_url" TEXT;
