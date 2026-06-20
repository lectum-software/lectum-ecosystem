-- CreateTable
CREATE TABLE "post_notification_mutes" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,

    CONSTRAINT "post_notification_mutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_notification_mutes_post_id_idx" ON "post_notification_mutes"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_notification_mutes_user_id_post_id_key" ON "post_notification_mutes"("user_id", "post_id");

-- AddForeignKey
ALTER TABLE "post_notification_mutes" ADD CONSTRAINT "post_notification_mutes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_notification_mutes" ADD CONSTRAINT "post_notification_mutes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
