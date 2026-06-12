-- CreateTable
CREATE TABLE "community_suggestions" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',

    CONSTRAINT "community_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_suggestions_status_idx" ON "community_suggestions"("status");

-- AddForeignKey
ALTER TABLE "community_suggestions" ADD CONSTRAINT "community_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
