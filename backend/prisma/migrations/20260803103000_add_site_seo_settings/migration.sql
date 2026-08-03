CREATE TABLE "site_seo_settings" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "page_key" TEXT NOT NULL,
  "route_path" TEXT,
  "label" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "keywords" JSONB,
  "og_title" TEXT,
  "og_description" TEXT,
  "og_image_url" TEXT,
  "canonical_url" TEXT,
  "robots_index" BOOLEAN NOT NULL DEFAULT true,
  "robots_follow" BOOLEAN NOT NULL DEFAULT true,
  "updated_by_admin_id" TEXT,

  CONSTRAINT "site_seo_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "site_seo_settings_page_key_key" ON "site_seo_settings"("page_key");
CREATE INDEX "site_seo_settings_route_path_deleted_idx" ON "site_seo_settings"("route_path", "deleted");
CREATE INDEX "site_seo_settings_robots_index_deleted_idx" ON "site_seo_settings"("robots_index", "deleted");
