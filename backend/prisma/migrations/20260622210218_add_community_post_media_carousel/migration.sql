-- CreateTable
CREATE TABLE "community_post_media" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "post_id" TEXT NOT NULL,
    "media_url" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "community_post_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_post_media_post_id_position_idx" ON "community_post_media"("post_id", "position");

-- AddForeignKey
ALTER TABLE "community_post_media" ADD CONSTRAINT "community_post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
