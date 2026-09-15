import { error, msg } from "@/helpers/translate";
import { VideoAssetRepository } from "./repository";
import {
  toVideoUploadClientEventLog,
  type VideoUploadClientEvent,
} from "./upload-diagnostics-policy";

export const recordOwnedVideoUploadClientEvent = async (
  assetId: string,
  ownerId: string,
  event: VideoUploadClientEvent,
) => {
  const asset = await new VideoAssetRepository().findOwned(assetId, ownerId);
  if (!asset) return { status: 404, ...error("video_asset_not_found", {}) };

  // Untrusted client reports only: never reconcile status, attach media or call a provider.
  console.info("[VIDEO_STREAM_UPLOAD_CLIENT_EVENT]", toVideoUploadClientEventLog(event, asset));

  return {
    status: 200,
    ...msg("video_upload_event_received", {}),
    data: { received: true },
  };
};
