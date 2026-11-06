CREATE TABLE "video_captions" (
  "asset_id" TEXT NOT NULL PRIMARY KEY,
  "state" TEXT NOT NULL DEFAULT 'inprogress',
  "language" TEXT NOT NULL DEFAULT 'pt',
  "cues" JSONB,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "reviewed_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "video_captions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "video_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "video_captions_state_check" CHECK ("state" IN ('inprogress', 'ready', 'error'))
);
