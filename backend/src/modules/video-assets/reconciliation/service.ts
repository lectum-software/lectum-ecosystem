import {
  getVideoStreamProvider,
  isCloudflareStreamVideoUid,
  type VideoStreamDetails,
} from "@/infra/video-stream";
import { resolveR2MigrationTargetEnvironment } from "../r2-migration/policy";
import {
  canReconcileVideoUpload,
  classifyReconciliationProviderFailure,
  planVideoUploadReconciliation,
  type ReconciliationProviderFailure,
  reconciliationIdentityRef,
  safeReconciliationError,
  safeReconciliationMimeType,
  safeReconciliationPurpose,
  safeReconciliationStatus,
} from "./policy";
import { VideoUploadReconciliationRepository } from "./repository";
import type { ReconcileVideoUploadOptions } from "./types";

export const reconcileVideoUploads = async (options: ReconcileVideoUploadOptions) => {
  // Defense in depth: never expose this maintenance operation as batch write.
  if (
    Boolean(options.assetId) === Boolean(options.ownerId) ||
    !Number.isSafeInteger(options.limit) ||
    options.limit < 1 ||
    options.limit > 20 ||
    !Number.isSafeInteger(options.offset) ||
    options.offset < 0 ||
    options.offset > 10_000 ||
    (options.assetId && (options.limit !== 1 || options.offset !== 0)) ||
    (options.apply &&
      (!options.assetId ||
        options.ownerId ||
        !options.confirmation ||
        options.confirmation !== resolveR2MigrationTargetEnvironment(process.env)))
  )
    throw new Error("invalid_scope");
  const repository = new VideoUploadReconciliationRepository();
  const provider = getVideoStreamProvider();
  const candidates = await repository.list(options);
  const items = [];
  for (const asset of candidates.slice(0, options.limit)) {
    const now = new Date();
    const associations = await repository.associations(asset);
    const validProvider =
      asset.provider === "cloudflare_stream" && isCloudflareStreamVideoUid(asset.provider_uid);
    let details: VideoStreamDetails | null = null;
    let providerFailure: ReconciliationProviderFailure | null = !validProvider
      ? "invalid_reference"
      : !provider
        ? "config_missing"
        : null;
    if (provider && validProvider) {
      try {
        details = await provider.getVideo(asset.provider_uid);
      } catch (error) {
        // Missing assets, authorization failures and provider outages never authorize a mutation.
        providerFailure = classifyReconciliationProviderFailure(error);
      }
    }
    const plan = details ? planVideoUploadReconciliation(asset, details, now) : null;
    const applied = options.apply && plan ? await repository.apply(asset, plan, now) : false;
    items.push({
      uploadRef: reconciliationIdentityRef(asset.id),
      ownerRef: reconciliationIdentityRef(asset.owner_id),
      contextRef: asset.context_id ? reconciliationIdentityRef(asset.context_id) : null,
      createdAt: asset.createdAt.toISOString(),
      uploadExpiresAt: asset.upload_expires_at.toISOString(),
      lastProviderSyncAt: asset.last_provider_sync_at?.toISOString() ?? null,
      lastWebhookAt: asset.last_webhook_at?.toISOString() ?? null,
      sizeBytes: asset.size_bytes.toString(),
      mimeType: safeReconciliationMimeType(asset.mime_type),
      purpose: safeReconciliationPurpose(asset.purpose),
      localStatus: safeReconciliationStatus(asset.status),
      localError: safeReconciliationError(asset.error_code),
      deleted: asset.deleted,
      ownerActive: asset.owner.active,
      ownerDeleted: asset.owner.deleted,
      uploadExpired: asset.upload_expires_at.getTime() <= now.getTime(),
      previouslySynced: asset.last_provider_sync_at !== null,
      webhookReceived: asset.last_webhook_at !== null,
      previouslyReady: asset.ready_at !== null,
      providerReferenceValid: validProvider,
      providerConfigured: Boolean(provider),
      providerReadSucceeded: details !== null,
      providerFailure,
      providerStatus: details ? safeReconciliationStatus(details.status) : null,
      eligibleForApply: canReconcileVideoUpload(asset),
      proposedStatus: plan?.status ?? null,
      proposedError: plan?.errorCode ?? null,
      applied,
      concurrentChange: Boolean(options.apply && plan && !applied),
      ...associations,
    });
  }
  return {
    mode: options.apply ? "apply" : "dry-run",
    count: items.length,
    hasMore: candidates.length > options.limit,
    nextOffset:
      !options.assetId &&
      candidates.length > options.limit &&
      options.offset + options.limit <= 10_000
        ? options.offset + options.limit
        : null,
    items,
  };
};
