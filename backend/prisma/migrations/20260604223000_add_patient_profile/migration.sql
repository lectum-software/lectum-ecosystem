CREATE TABLE "patient_profiles" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" TEXT NOT NULL,
  "goal" TEXT,
  "birthdate" TIMESTAMP(3),
  "phone" TEXT,
  "bio" TEXT,
  "onboarding_completed_at" TIMESTAMP(3),

  CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");
CREATE INDEX "patient_profiles_user_id_idx" ON "patient_profiles"("user_id");

ALTER TABLE "patient_profiles"
  ADD CONSTRAINT "patient_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
