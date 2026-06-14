-- CreateTable
CREATE TABLE "post_reply_saves" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "reply_id" TEXT NOT NULL,

    CONSTRAINT "post_reply_saves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_reply_saves_user_id_created_at_idx" ON "post_reply_saves"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "post_reply_saves_reply_id_idx" ON "post_reply_saves"("reply_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_reply_saves_user_id_reply_id_key" ON "post_reply_saves"("user_id", "reply_id");

-- AddForeignKey
ALTER TABLE "post_reply_saves" ADD CONSTRAINT "post_reply_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reply_saves" ADD CONSTRAINT "post_reply_saves_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "post_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
