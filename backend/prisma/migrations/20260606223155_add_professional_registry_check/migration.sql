-- CreateTable
CREATE TABLE "professional_registry_checks" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "psychologist_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'infosimples',
    "cpf" TEXT,
    "registro" TEXT,
    "uf" TEXT,
    "found" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_registry_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "professional_registry_checks_psychologist_id_checked_at_idx" ON "professional_registry_checks"("psychologist_id", "checked_at");

-- CreateIndex
CREATE INDEX "professional_registry_checks_cpf_idx" ON "professional_registry_checks"("cpf");

-- AddForeignKey
ALTER TABLE "professional_registry_checks" ADD CONSTRAINT "professional_registry_checks_psychologist_id_fkey" FOREIGN KEY ("psychologist_id") REFERENCES "psychologist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
