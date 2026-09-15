-- AlterTable
-- Campos opcionais preservam a origem R2 e permitem backfill retomavel sem
-- alterar os registros Stream existentes.
ALTER TABLE "video_assets"
ADD COLUMN "source_provider" TEXT,
ADD COLUMN "source_reference" TEXT,
ADD COLUMN "source_thumbnail_reference" TEXT,
ADD COLUMN "migration_key" TEXT,
ADD COLUMN "migrated_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "video_assets_migration_key_key" ON "video_assets"("migration_key");
