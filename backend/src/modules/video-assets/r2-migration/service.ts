import {
  type CloudflareStreamAdapter,
  isCloudflareStreamVideoUid,
  type VideoStreamDetails,
  VideoStreamProviderError,
} from "@/infra/video-stream";
import { deleteRetiredProviderVideos } from "../lifecycle";
import { VideoAssetRepository } from "../repository";
import type { VideoAssetRecord } from "../types";
import { createR2MigrationIdentity } from "./policy";
import { R2VideoMigrationRepository } from "./repository";
import { inspectLegacyVideoSource, R2MigrationSourceError } from "./source";
import type { LegacyVideoCandidate, MigrationItemResult } from "./types";

type MigrationServiceOptions = {
  apply: boolean;
  pollIntervalMs: number;
  waitTimeoutMs: number;
};

const providerUpdateFrom = (details: VideoStreamDetails) => ({
  durationSeconds: details.durationSeconds,
  errorCode: details.status === "error" ? details.errorCode || "processing_failed" : null,
  height: details.height,
  status: details.status,
  width: details.width,
});

const safeFailureReason = (error: unknown) => {
  if (error instanceof R2MigrationSourceError) return error.reason;
  if (error instanceof VideoStreamProviderError) return "stream_provider_unavailable";
  if (error instanceof Error && error.message === "R2_MIGRATION_RESERVATION_CONFLICT") {
    return "migration_reservation_conflict";
  }
  return "migration_unexpected_failure";
};

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class R2ToStreamMigrationService {
  private readonly migrationRepository = new R2VideoMigrationRepository();
  private readonly videoAssetRepository = new VideoAssetRepository();

  constructor(private readonly provider: CloudflareStreamAdapter) {}

  private async activateProviderAsset(
    candidate: LegacyVideoCandidate,
    asset: VideoAssetRecord,
    publicUrl: string,
  ) {
    if (isCloudflareStreamVideoUid(asset.provider_uid)) return asset;

    let createdNow = false;
    let details = await this.provider.findVideoByCreator(asset.id);
    if (!details) {
      details = await this.provider.importVideoByUrl({ assetId: asset.id, sourceUrl: publicUrl });
      createdNow = true;
    }

    const activated = await this.migrationRepository.activateProvider(asset, details);
    if (activated) return activated;

    const current = asset.migration_key
      ? await this.migrationRepository.findByMigrationKey(asset.migration_key)
      : null;
    if (current?.provider_uid === details.providerUid) return current;

    if (createdNow) {
      await this.provider.deleteVideo(details.providerUid).catch(() => undefined);
    }
    throw new Error(`R2_MIGRATION_PROVIDER_ACTIVATION_FAILED:${candidate.purpose}`);
  }

  private async syncProviderAsset(asset: VideoAssetRecord) {
    const details = await this.provider.getVideo(asset.provider_uid);
    const updated = await this.videoAssetRepository.applyProviderUpdate(
      asset,
      providerUpdateFrom(details),
    );
    return updated ?? this.videoAssetRepository.findById(asset.id);
  }

  private async waitUntilTerminal(
    asset: VideoAssetRecord,
    options: MigrationServiceOptions,
  ): Promise<VideoAssetRecord | null> {
    const deadline = Date.now() + options.waitTimeoutMs;
    let current: VideoAssetRecord | null = asset;

    while (current && Date.now() <= deadline) {
      current = await this.syncProviderAsset(current);
      if (current?.status === "ready" || current?.status === "error") return current;
      await sleep(options.pollIntervalMs);
    }

    return current;
  }

  async process(
    candidate: LegacyVideoCandidate,
    options: MigrationServiceOptions,
  ): Promise<MigrationItemResult> {
    const identity = createR2MigrationIdentity(
      candidate.purpose,
      candidate.targetId,
      candidate.sourceObjectKey,
    );
    const startedAt = Date.now();

    console.info("[R2_STREAM_MIGRATION_ITEM_START]", {
      migrationRef: identity.migrationRef,
      purpose: candidate.purpose,
    });

    try {
      const source = await inspectLegacyVideoSource(candidate);
      if (!options.apply) {
        console.info("[R2_STREAM_MIGRATION_ITEM_ELIGIBLE]", {
          elapsedMs: Date.now() - startedAt,
          migrationRef: identity.migrationRef,
          purpose: candidate.purpose,
          sizeBytes: source.sizeBytes,
        });
        return {
          migrationRef: identity.migrationRef,
          outcome: "eligible",
          purpose: candidate.purpose,
          sizeBytes: source.sizeBytes,
        };
      }

      const reservation = await this.migrationRepository.findOrReserve(candidate, source, identity);
      if (reservation.state === "blocked") {
        return {
          migrationRef: identity.migrationRef,
          outcome: "skipped",
          purpose: candidate.purpose,
          reason: reservation.reason,
          sizeBytes: source.sizeBytes,
        };
      }

      let asset = await this.activateProviderAsset(candidate, reservation.asset, source.publicUrl);
      asset = (await this.waitUntilTerminal(asset, options)) ?? asset;

      if (asset.status === "error") {
        return {
          migrationRef: identity.migrationRef,
          outcome: "failed",
          purpose: candidate.purpose,
          reason: "stream_processing_failed",
          sizeBytes: source.sizeBytes,
        };
      }
      if (asset.status !== "ready") {
        return {
          migrationRef: identity.migrationRef,
          outcome: "processing",
          purpose: candidate.purpose,
          reason: "stream_processing_timeout",
          sizeBytes: source.sizeBytes,
        };
      }

      const attachment = await this.migrationRepository.attachReadyCandidate(candidate, asset);
      if (attachment.retiredProviderUids.length > 0) {
        await deleteRetiredProviderVideos(attachment.retiredProviderUids);
      }

      const outcome =
        attachment.state === "attached"
          ? "migrated"
          : attachment.state === "already_attached"
            ? "already_attached"
            : attachment.state === "source_changed"
              ? "skipped"
              : "failed";

      console.info("[R2_STREAM_MIGRATION_ITEM_FINISH]", {
        elapsedMs: Date.now() - startedAt,
        migrationRef: identity.migrationRef,
        outcome,
        purpose: candidate.purpose,
        sizeBytes: source.sizeBytes,
      });

      return {
        migrationRef: identity.migrationRef,
        outcome,
        purpose: candidate.purpose,
        ...(outcome === "skipped" ? { reason: "source_changed_during_migration" } : {}),
        ...(outcome === "failed" ? { reason: "migration_attachment_invalid" } : {}),
        sizeBytes: source.sizeBytes,
      };
    } catch (error) {
      const reason = safeFailureReason(error);
      console.error("[R2_STREAM_MIGRATION_ITEM_FAILED]", {
        elapsedMs: Date.now() - startedAt,
        migrationRef: identity.migrationRef,
        purpose: candidate.purpose,
        reason,
      });
      return {
        migrationRef: identity.migrationRef,
        outcome: "failed",
        purpose: candidate.purpose,
        reason,
      };
    }
  }
}
