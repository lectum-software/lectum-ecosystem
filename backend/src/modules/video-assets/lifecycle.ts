import {
  getVideoStreamProvider,
  isCloudflareStreamVideoUid,
  type VideoAssetPurpose,
  VideoStreamProviderError,
  videoAssetIdFromReference,
} from "@/infra/video-stream";
import { VideoAssetRepository } from "./repository";

const providerFailureContext = (error: unknown) =>
  error instanceof VideoStreamProviderError
    ? { operation: error.operation, status: error.status }
    : { operation: "delete_video", status: null };

export const deleteRetiredProviderVideos = async (providerUids: readonly string[]) => {
  const provider = getVideoStreamProvider();
  if (!provider || providerUids.length === 0) return;

  for (const providerUid of new Set(providerUids)) {
    if (!isCloudflareStreamVideoUid(providerUid)) continue;
    try {
      await provider.deleteVideo(providerUid);
    } catch (error) {
      console.warn("[VIDEO_STREAM_RETIRE_DELETE_DEGRADED]", providerFailureContext(error));
    }
  }
};

export const retireOwnedVideoAssetReference = async ({
  ownerId,
  purpose,
  reference,
}: {
  ownerId: string;
  purpose: VideoAssetPurpose;
  reference?: string | null;
}) => {
  const assetId = videoAssetIdFromReference(reference);
  if (!assetId) return false;

  const repository = new VideoAssetRepository();
  const asset = await repository.findOwned(assetId, ownerId);
  if (!asset || asset.purpose !== purpose) return false;

  await repository.cancel(asset);
  await deleteRetiredProviderVideos([asset.provider_uid]);
  return true;
};
