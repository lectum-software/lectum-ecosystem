-- AlterTable
ALTER TABLE "patient_profiles" ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT;

-- CreateIndex
CREATE INDEX "patient_profiles_state_city_idx" ON "patient_profiles"("state", "city");
