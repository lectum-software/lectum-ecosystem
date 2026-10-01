import { VideoStreamProviderError } from "@/infra/video-stream/cloudflare-stream";
import type { VideoAssetStatus, VideoStreamDetails } from "@/infra/video-stream/types";
import type { VideoAssetRecord } from "../types";

export { resolveVideoUploadRef as reconciliationIdentityRef } from "../upload-diagnostics-policy";

export type ReconciliationSnapshot = Pick<
  VideoAssetRecord,
  | "deleted"
  | "status"
  | "error_code"
  | "provider"
  | "provider_uid"
  | "purpose"
  | "migration_key"
  | "source_provider"
  | "upload_expires_at"
>;

export type VideoUploadReconciliationUpdate = {
  status: "uploading" | "processing" | "ready" | "error";
  errorCode: "upload_expired" | "processing_failed" | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
};

export const safeReconciliationStatus = (status: string): VideoAssetStatus | "unknown" =>
  ["uploading", "processing", "ready", "error", "canceled"].includes(status)
    ? (status as VideoAssetStatus)
    : "unknown";

export const safeReconciliationPurpose = (purpose: string) =>
  purpose === "community_post" ||
  purpose === "community_reply" ||
  purpose === "profile_presentation"
    ? purpose
    : "unknown";

export const safeReconciliationError = (code: string | null) =>
  code === null || code === "upload_expired" || code === "processing_failed" ? code : "other";

export const safeReconciliationMimeType = (mime: string) =>
  mime === "video/mp4" || mime === "video/quicktime" || mime === "video/webm" ? mime : "other";

export type ReconciliationProviderFailure =
  | "config_missing"
  | "invalid_reference"
  | "not_found"
  | "access_denied"
  | "rate_limited"
  | "unavailable"
  | "unexpected";

export const classifyReconciliationProviderFailure = (
  error: unknown,
): ReconciliationProviderFailure => {
  if (!(error instanceof VideoStreamProviderError)) return "unexpected";
  if (error.status === 404) return "not_found";
  if (error.status === 401 || error.status === 403) return "access_denied";
  if (error.status === 429) return "rate_limited";
  if (error.status === null || error.status >= 500) return "unavailable";
  return "unexpected";
};

export const canReconcileVideoUpload = (asset: ReconciliationSnapshot) =>
  !asset.deleted &&
  asset.provider === "cloudflare_stream" &&
  !asset.migration_key &&
  !asset.source_provider &&
  (asset.purpose === "community_post" || asset.purpose === "community_reply") &&
  (asset.status === "uploading" ||
    asset.status === "processing" ||
    (asset.status === "error" && asset.error_code === "upload_expired"));

export const planVideoUploadReconciliation = (
  asset: ReconciliationSnapshot,
  details: VideoStreamDetails,
  now: Date,
): VideoUploadReconciliationUpdate | null => {
  if (
    !canReconcileVideoUpload(asset) ||
    details.providerUid !== asset.provider_uid ||
    details.status === "canceled"
  )
    return null;
  // Never regress processing to an upload reservation on a stale provider response.
  if (asset.status === "processing" && details.status === "uploading") return null;
  const expired =
    details.status === "uploading" && asset.upload_expires_at.getTime() <= now.getTime();
  if (asset.status === "error" && details.status === "uploading" && !expired) return null;
  return {
    status: expired ? "error" : details.status,
    errorCode: expired ? "upload_expired" : details.status === "error" ? "processing_failed" : null,
    durationSeconds: details.durationSeconds,
    height: details.height,
    width: details.width,
  };
};
