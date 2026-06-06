-- CreateTable
CREATE TABLE "psychologist_favorites" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "psychologist_id" TEXT NOT NULL,

    CONSTRAINT "psychologist_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychologist_follows" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "psychologist_id" TEXT NOT NULL,

    CONSTRAINT "psychologist_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "psychologist_favorites_user_id_deleted_idx" ON "psychologist_favorites"("user_id", "deleted");

-- CreateIndex
CREATE INDEX "psychologist_favorites_psychologist_id_idx" ON "psychologist_favorites"("psychologist_id");

-- CreateIndex
CREATE UNIQUE INDEX "psychologist_favorites_user_id_psychologist_id_key" ON "psychologist_favorites"("user_id", "psychologist_id");

-- CreateIndex
CREATE INDEX "psychologist_follows_user_id_deleted_idx" ON "psychologist_follows"("user_id", "deleted");

-- CreateIndex
CREATE INDEX "psychologist_follows_psychologist_id_idx" ON "psychologist_follows"("psychologist_id");

-- CreateIndex
CREATE UNIQUE INDEX "psychologist_follows_user_id_psychologist_id_key" ON "psychologist_follows"("user_id", "psychologist_id");

-- AddForeignKey
ALTER TABLE "psychologist_favorites" ADD CONSTRAINT "psychologist_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychologist_favorites" ADD CONSTRAINT "psychologist_favorites_psychologist_id_fkey" FOREIGN KEY ("psychologist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychologist_follows" ADD CONSTRAINT "psychologist_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychologist_follows" ADD CONSTRAINT "psychologist_follows_psychologist_id_fkey" FOREIGN KEY ("psychologist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
