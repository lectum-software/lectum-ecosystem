import type { VideoAssetPurpose } from "@/infra/video-stream";

export const R2_MIGRATION_SOURCE_PROVIDER = "cloudflare_r2";

export type R2MigrationPurpose = VideoAssetPurpose;

export type LegacyVideoCandidate = {
  contextId: string;
  ownerId: string;
  purpose: R2MigrationPurpose;
  sourceObjectKey: string;
  sourceReference: string;
  sourceThumbnailReference: string | null;
  targetId: string;
};

export type InspectedLegacyVideoSource = {
  mimeType: string;
  publicUrl: string;
  sizeBytes: number;
};

export type MigrationItemOutcome =
  | "already_attached"
  | "eligible"
  | "failed"
  | "migrated"
  | "processing"
  | "skipped";

export type MigrationItemResult = {
  migrationRef: string;
  outcome: MigrationItemOutcome;
  purpose: R2MigrationPurpose;
  reason?: string;
  sizeBytes?: number;
};
