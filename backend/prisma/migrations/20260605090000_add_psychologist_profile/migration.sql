CREATE TABLE "psychologist_profiles" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" TEXT NOT NULL,
  "headline" TEXT,
  "bio" TEXT,
  "video_url" TEXT,
  "cpf" TEXT,
  "crp" TEXT,
  "crp_status" TEXT NOT NULL DEFAULT 'pendente',
  "cfp_verified_at" TIMESTAMP(3),
  "whatsapp" TEXT,
  "whatsapp_verified_at" TIMESTAMP(3),
  "languages" JSONB,
  "modality" TEXT,
  "rating_avg" INTEGER NOT NULL DEFAULT 0,
  "rating_count" INTEGER NOT NULL DEFAULT 0,
  "published" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "psychologist_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "psychologist_profiles_user_id_key" ON "psychologist_profiles"("user_id");
CREATE INDEX "psychologist_profiles_user_id_idx" ON "psychologist_profiles"("user_id");
CREATE INDEX "psychologist_profiles_published_deleted_idx" ON "psychologist_profiles"("published", "deleted");

ALTER TABLE "psychologist_profiles"
  ADD CONSTRAINT "psychologist_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;