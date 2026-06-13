-- CreateTable
CREATE TABLE "post_replies" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_reply_id" TEXT,
    "content" TEXT NOT NULL,
    "upvotes_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_replies_post_id_parent_reply_id_created_at_idx" ON "post_replies"("post_id", "parent_reply_id", "created_at");

-- CreateIndex
CREATE INDEX "post_replies_author_id_idx" ON "post_replies"("author_id");

-- AddForeignKey
ALTER TABLE "post_replies" ADD CONSTRAINT "post_replies_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_replies" ADD CONSTRAINT "post_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_replies" ADD CONSTRAINT "post_replies_parent_reply_id_fkey" FOREIGN KEY ("parent_reply_id") REFERENCES "post_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
