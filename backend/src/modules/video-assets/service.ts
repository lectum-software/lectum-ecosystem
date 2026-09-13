import { createHash, randomUUID } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { error, msg } from "@/helpers/translate";
import {
  getVideoStreamConfig,
  getVideoStreamMaxDurationSeconds,
  getVideoStreamProvider,
  isCloudflareStreamVideoUid,
  normalizeVideoAssetPlaybackReference,
  type VideoAssetPurpose,
  type VideoAssetStatus,
  type VideoAssetUploadMethod,
  VideoStreamProviderError,
  verifyVideoStreamWebhook,
  videoAssetPlaybackReference,
} from "@/infra/video-stream";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { deletePublicProfileMedia } from "../profile-media/public-storage";
import { deleteRetiredProviderVideos } from "./lifecycle";
import { isR2MigrationAsset } from "./r2-migration/policy";
import { VideoAssetRepository } from "./repository";
import type { VideoAssetCancelOptions, VideoAssetProviderUpdate, VideoAssetRecord } from "./types";
import { getVideoAssetUploadFailure, validateVideoAssetUploadMetadata } from "./upload-policy";

const PROVIDER_SYNC_INTERVAL_MS = 10_000;
const CLOUDFLARE_BASIC_DIRECT_UPLOAD_LIMIT_BYTES = 200_000_000;

const streamUnavailable = () => ({
  status: 503,
  ...error("video_stream_unavailable", {}),
});

const assetNotFound = () => ({
  status: 404,
  ...error("video_asset_not_found", {}),
});

const invalidUpload = () => ({
  status: 422,
  ...error("video_upload_invalid", {}),
});

const toStatusData = (asset: VideoAssetRecord) => ({
  asset_id: asset.id,
  duration_seconds: asset.duration_seconds,
  height: asset.height,
  media_url: asset.status === "ready" ? videoAssetPlaybackReference(asset.id) : null,
  status: asset.status as VideoAssetStatus,
  width: asset.width,
});

const safeProviderLog = (errorValue: unknown) => {
  if (errorValue instanceof VideoStreamProviderError) {
    return {
      operation: errorValue.operation,
      status: errorValue.status,
    };
  }

  return toSafeErrorLog(errorValue, "UnknownVideoStreamError");
};

export const provisionVideoAssetUpload = async ({
  acceptedUploadMethods,
  contextId,
  mimeType: rawMimeType,
  ownerId,
  purpose,
  size,
}: {
  acceptedUploadMethods?: { basic?: boolean; tus?: boolean };
  contextId: string;
  mimeType: string;
  ownerId: string;
  purpose: VideoAssetPurpose;
  size: number;
}) => {
  if (!ownerId || !contextId) return invalidUpload();

  const uploadValidation = validateVideoAssetUploadMetadata({
    mimeType: rawMimeType,
    purpose,
    size,
  });
  if (!uploadValidation.accepted) {
    const failure = getVideoAssetUploadFailure(uploadValidation);
    return {
      status: failure.status,
      ...error(failure.code, failure.data),
    };
  }

  const config = getVideoStreamConfig();
  const provider = getVideoStreamProvider();
  if (!config || !provider) return streamUnavailable();

  const { limitBytes, mimeType } = uploadValidation;
  const repository = new VideoAssetRepository();
  const assetId = createId();
  const traceId = randomUUID();
  const expiresAt = new Date(Date.now() + config.uploadExpirySeconds * 1_000);
  const startedAt = Date.now();
  const uploadMethods = resolveProvisionUploadMethods({ acceptedUploadMethods, size });

  const reservation = await repository.reserveUpload({
    contextId,
    expiresAt,
    id: assetId,
    mimeType,
    ownerId,
    purpose,
    sizeBytes: size,
  });
  if (!reservation) {
    return {
      status: 429,
      ...error("video_upload_rate_limited", {}),
    };
  }

  console.info("[VIDEO_STREAM_UPLOAD_PROVISION_START]", {
    purpose,
    sizeBytes: size,
    traceId,
  });

  let lastProviderError: unknown = null;
  let provisionedUid: string | null = null;
  try {
    let provisioned: Awaited<ReturnType<typeof provider.provisionUpload>> | null = null;
    for (const uploadMethod of uploadMethods) {
      try {
        provisioned = await provider.provisionUpload({
          assetId,
          expiresAt,
          maxDurationSeconds: getVideoStreamMaxDurationSeconds(),
          purpose,
          sizeBytes: size,
          uploadMethod,
        });
        break;
      } catch (providerError) {
        lastProviderError = providerError;
        console.warn("[VIDEO_STREAM_UPLOAD_PROVISION_METHOD_FAILED]", {
          ...safeProviderLog(providerError),
          purpose,
          traceId,
          uploadMethod,
        });
      }
    }

    if (!provisioned) {
      throw lastProviderError instanceof Error
        ? lastProviderError
        : new VideoStreamProviderError("provision_upload", null);
    }

    provisionedUid = provisioned.providerUid;
    const activated = await repository.activateUploadReservation(assetId, ownerId, provisionedUid);
    if (!activated) throw new Error("Video upload reservation could not be activated");

    console.info("[VIDEO_STREAM_UPLOAD_PROVISION_SUCCESS]", {
      elapsedMs: Date.now() - startedAt,
      purpose,
      sizeBytes: size,
      traceId,
      uploadMethod: provisioned.uploadMethod,
    });

    return {
      status: 201,
      ...msg("video_upload_created", {}),
      data: {
        asset_id: assetId,
        expires_at: expiresAt.toISOString(),
        max_file_size: limitBytes,
        status: "uploading",
        upload_method: provisioned.uploadMethod,
        upload_url: provisioned.uploadUrl,
      },
    };
  } catch (providerError) {
    const canceled = await repository
      .cancel(reservation, { onlyUnattached: true })
      .catch(() => null);
    if (canceled?.kind === "canceled" && provisionedUid) {
      await provider.deleteVideo(provisionedUid).catch(() => undefined);
    }
    console.error("[VIDEO_STREAM_UPLOAD_PROVISION_FAILED]", {
      ...safeProviderLog(providerError),
      elapsedMs: Date.now() - startedAt,
      purpose,
      traceId,
    });
    return streamUnavailable();
  }
};

const resolveProvisionUploadMethods = ({
  acceptedUploadMethods,
  size,
}: {
  acceptedUploadMethods?: { basic?: boolean; tus?: boolean };
  size: number;
}): VideoAssetUploadMethod[] => {
  const acceptsTus = acceptedUploadMethods?.tus !== false;
  const methods: VideoAssetUploadMethod[] = [];

  if (acceptedUploadMethods?.basic === true && size <= CLOUDFLARE_BASIC_DIRECT_UPLOAD_LIMIT_BYTES) {
    methods.push("basic");
  }

  if (acceptsTus) methods.push("tus");

  return methods.length > 0 ? methods : ["tus"];
};

const shouldSync = (asset: VideoAssetRecord) =>
  asset.status !== "ready" &&
  asset.status !== "error" &&
  asset.status !== "canceled" &&
  (!asset.last_provider_sync_at ||
    Date.now() - asset.last_provider_sync_at.getTime() >= PROVIDER_SYNC_INTERVAL_MS);

const syncAsset = async (asset: VideoAssetRecord) => {
  const repository = new VideoAssetRepository();
  if (!shouldSync(asset)) return asset;

  const provider = getVideoStreamProvider();
  if (!provider) return asset;

  try {
    const details = await provider.getVideo(asset.provider_uid);
    let updated = await repository.applyProviderUpdate(asset, {
      durationSeconds: details.durationSeconds,
      errorCode: details.status === "error" ? "processing_failed" : null,
      height: details.height,
      status: details.status,
      width: details.width,
    });
    if (updated?.status === "uploading" && updated.upload_expires_at.getTime() <= Date.now()) {
      updated = await repository.markExpired(updated);
    }
    if (updated) await attachReadyProfileAsset(repository, updated);
    return updated ?? asset;
  } catch (providerError) {
    console.warn("[VIDEO_STREAM_STATUS_SYNC_DEGRADED]", safeProviderLog(providerError));
    return asset;
  }
};

const attachReadyProfileAsset = async (
  repository: VideoAssetRepository,
  asset: VideoAssetRecord,
) => {
  const attachment = await repository.attachReadyProfileAsset(asset);
  if (!attachment.attached) return;

  const preserveR2Source = isR2MigrationAsset(asset);

  await Promise.all([
    preserveR2Source ? Promise.resolve() : deletePublicProfileMedia(attachment.previousVideoUrl),
    preserveR2Source
      ? Promise.resolve()
      : deletePublicProfileMedia(attachment.previousVideoCoverUrl),
    deleteRetiredProviderVideos(attachment.retiredProviderUids),
  ]);
};

export const showOwnedVideoAssetStatus = async (assetId: string, ownerId: string) => {
  const repository = new VideoAssetRepository();
  const asset = await repository.findOwned(assetId, ownerId);
  if (!asset) return assetNotFound();

  const current = await syncAsset(asset);
  return {
    status: 200,
    ...msg("video_status_checked", {}),
    data: toStatusData(current),
  };
};

export const cancelOwnedVideoAsset = async (
  assetId: string,
  ownerId: string,
  options: VideoAssetCancelOptions = {},
) => {
  const result = await new VideoAssetRepository().cancel(
    { id: assetId, owner_id: ownerId },
    options,
  );
  if (result.kind === "attached") {
    return { status: 409, ...error("video_asset_attached", {}) };
  }

  // A failed/uncertain transaction must never authorize destructive compensation.
  // not_found is idempotent for callers, but does not authorize another provider delete.
  if (result.kind === "canceled") {
    const provider = getVideoStreamProvider();
    if (provider) {
      await provider.deleteVideo(result.asset.provider_uid).catch((providerError) => {
        console.warn("[VIDEO_STREAM_DELETE_DEGRADED]", safeProviderLog(providerError));
      });
    }
  }

  return {
    status: 200,
    ...msg("video_upload_canceled", {}),
    data: { canceled: true },
  };
};

const playbackResponse = async (asset: VideoAssetRecord) => {
  const provider = getVideoStreamProvider();
  if (!provider || asset.provider !== "cloudflare_stream") return streamUnavailable();

  const playback = provider.createPlayback(asset.provider_uid);
  return {
    allowSignedMediaUrls: true,
    status: 200,
    ...msg("video_playback_authorized", {}),
    data: {
      expires_at: playback.expiresAt.toISOString(),
      hls_url: playback.hlsUrl,
      thumbnail_url: playback.thumbnailUrl,
    },
  };
};

export const authorizePublicVideoAssetPlayback = async (
  assetId: string,
  userId?: string | null,
) => {
  const repository = new VideoAssetRepository();
  const asset = await repository.findById(assetId);
  if (
    asset?.status !== "ready" ||
    asset.provider !== "cloudflare_stream" ||
    !isCloudflareStreamVideoUid(asset.provider_uid)
  ) {
    return assetNotFound();
  }
  if (!(await repository.isPlaybackAuthorized(asset, userId))) {
    // O mesmo 404 de um ativo inexistente evita transformar a rota pública em
    // um oráculo de IDs para vídeos privados, removidos ou ainda não associados.
    return assetNotFound();
  }

  return playbackResponse(asset);
};

export const authorizeAdminVideoAssetPlayback = async (assetId: string) => {
  const repository = new VideoAssetRepository();
  const asset = await repository.findById(assetId);
  if (
    asset?.status !== "ready" ||
    asset.provider !== "cloudflare_stream" ||
    !isCloudflareStreamVideoUid(asset.provider_uid)
  ) {
    return assetNotFound();
  }
  return playbackResponse(asset);
};

export const resolveReadyOwnedVideoAssetReference = async (input: {
  contextId: string;
  ownerId: string;
  purpose: VideoAssetPurpose;
  reference: string;
}) => {
  const normalizedReference = normalizeVideoAssetPlaybackReference(input.reference);
  if (!normalizedReference || !(await new VideoAssetRepository().isReadyOwnedReference(input))) {
    return null;
  }

  return normalizedReference;
};

type StreamWebhookPayload = {
  duration?: unknown;
  input?: { height?: unknown; width?: unknown };
  readyToStream?: unknown;
  status?: { state?: unknown };
  uid?: unknown;
};

const finiteOrNull = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

const dimensionOrNull = (value: unknown) => {
  const number = finiteOrNull(value);
  return number === null ? null : Math.round(number);
};

const webhookProviderUpdate = (payload: StreamWebhookPayload): VideoAssetProviderUpdate => {
  const status: VideoAssetStatus =
    payload.readyToStream === true && payload.status?.state === "ready"
      ? "ready"
      : payload.status?.state === "error"
        ? "error"
        : "processing";

  return {
    durationSeconds: finiteOrNull(payload.duration),
    errorCode: status === "error" ? "processing_failed" : null,
    height: dimensionOrNull(payload.input?.height),
    status,
    width: dimensionOrNull(payload.input?.width),
  };
};

export const processVideoStreamWebhook = async ({
  body,
  signature,
}: {
  body: Buffer;
  signature?: string | string[];
}) => {
  const config = getVideoStreamConfig();
  if (!config) return streamUnavailable();

  if (!verifyVideoStreamWebhook({ body, header: signature, secret: config.webhookSecret })) {
    console.warn("[VIDEO_STREAM_WEBHOOK_REJECTED]", { reason: "signature" });
    return { status: 401, ...error("video_webhook_invalid", {}) };
  }

  let payload: StreamWebhookPayload;
  try {
    payload = JSON.parse(body.toString("utf8")) as StreamWebhookPayload;
  } catch {
    return { status: 400, ...error("video_webhook_invalid", {}) };
  }

  const providerUid = typeof payload.uid === "string" ? payload.uid.trim() : "";
  if (!isCloudflareStreamVideoUid(providerUid)) {
    return { status: 200, ...msg("video_webhook_processed", {}), data: { processed: false } };
  }

  const repository = new VideoAssetRepository();
  const asset = await repository.findByProviderUid(providerUid);
  if (!asset) {
    return { status: 200, ...msg("video_webhook_processed", {}), data: { processed: false } };
  }

  const digest = createHash("sha256")
    .update(Array.isArray(signature) ? signature[0] || "" : signature || "")
    .update(".")
    .update(body)
    .digest("hex");
  const updated = await repository.applyProviderUpdate(asset, webhookProviderUpdate(payload), {
    at: new Date(),
    digest,
  });
  if (updated) await attachReadyProfileAsset(repository, updated);

  return {
    status: 200,
    ...msg("video_webhook_processed", {}),
    data: { processed: Boolean(updated) },
  };
};
