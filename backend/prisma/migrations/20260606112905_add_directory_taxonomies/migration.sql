-- CreateTable
CREATE TABLE "specialties" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approaches" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "approaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychologist_specialties" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "psychologist_id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,

    CONSTRAINT "psychologist_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychologist_services" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "psychologist_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,

    CONSTRAINT "psychologist_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychologist_approaches" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "psychologist_id" TEXT NOT NULL,
    "approach_id" TEXT NOT NULL,

    CONSTRAINT "psychologist_approaches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specialties_slug_key" ON "specialties"("slug");

-- CreateIndex
CREATE INDEX "specialties_slug_active_idx" ON "specialties"("slug", "active");

-- CreateIndex
CREATE INDEX "specialties_active_deleted_idx" ON "specialties"("active", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_slug_active_idx" ON "services"("slug", "active");

-- CreateIndex
CREATE INDEX "services_active_deleted_idx" ON "services"("active", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "approaches_slug_key" ON "approaches"("slug");

-- CreateIndex
CREATE INDEX "approaches_slug_active_idx" ON "approaches"("slug", "active");

-- CreateIndex
CREATE INDEX "approaches_active_deleted_idx" ON "approaches"("active", "deleted");

-- CreateIndex
CREATE INDEX "psychologist_specialties_psychologist_id_idx" ON "psychologist_specialties"("psychologist_id");

-- CreateIndex
CREATE INDEX "psychologist_specialties_specialty_id_idx" ON "psychologist_specialties"("specialty_id");

-- CreateIndex
CREATE UNIQUE INDEX "psychologist_specialties_psychologist_id_specialty_id_key" ON "psychologist_specialties"("psychologist_id", "specialty_id");

-- CreateIndex
CREATE INDEX "psychologist_services_psychologist_id_idx" ON "psychologist_services"("psychologist_id");

-- CreateIndex
CREATE INDEX "psychologist_services_service_id_idx" ON "psychologist_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "psychologist_services_psychologist_id_service_id_key" ON "psychologist_services"("psychologist_id", "service_id");

-- CreateIndex
CREATE INDEX "psychologist_approaches_psychologist_id_idx" ON "psychologist_approaches"("psychologist_id");

-- CreateIndex
CREATE INDEX "psychologist_approaches_approach_id_idx" ON "psychologist_approaches"("approach_id");

-- CreateIndex
CREATE UNIQUE INDEX "psychologist_approaches_psychologist_id_approach_id_key" ON "psychologist_approaches"("psychologist_id", "approach_id");

-- CreateIndex
CREATE INDEX "psychologist_profiles_published_deleted_cfp_verified_at_idx" ON "psychologist_profiles"("published", "deleted", "cfp_verified_at");

-- CreateIndex
CREATE INDEX "users_active_deleted_idx" ON "users"("active", "deleted");

-- AddForeignKey
ALTER TABLE "psychologist_specialties" ADD CONSTRAINT "psychologist_specialties_psychologist_id_fkey" FOREIGN KEY ("psychologist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychologist_specialties" ADD CONSTRAINT "psychologist_specialties_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychologist_services" ADD CONSTRAINT "psychologist_services_psychologist_id_fkey" FOREIGN KEY ("psychologist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychologist_services" ADD CONSTRAINT "psychologist_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychologist_approaches" ADD CONSTRAINT "psychologist_approaches_psychologist_id_fkey" FOREIGN KEY ("psychologist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychologist_approaches" ADD CONSTRAINT "psychologist_approaches_approach_id_fkey" FOREIGN KEY ("approach_id") REFERENCES "approaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
