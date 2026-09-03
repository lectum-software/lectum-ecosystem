import { callEndpoint } from "@/api/generator";
import type {
  VideoAssetPlaybackResponse,
  VideoAssetStatusResponse,
  VideoAssetUploadRequest,
  VideoAssetUploadResponse,
} from "@/api/generator/types/video-assets";
import { handleReq } from "@/api/handle";
import { videoAssetIdFromReference } from "@/utils/video-stream";

const route = "/api/private/video-assets";

export const createVideoAssetUpload = (body: VideoAssetUploadRequest, signal?: AbortSignal) =>
  handleReq<VideoAssetUploadResponse>({
    ...callEndpoint({
      body,
      config: { signal },
      method: "POST",
      route: `${route}/uploads`,
    }),
    hideError: true,
  });

export const getVideoAssetStatus = (assetId: string, signal?: AbortSignal) =>
  handleReq<VideoAssetStatusResponse>({
    ...callEndpoint({
      config: { signal },
      params: { id: assetId },
      route: `${route}/:id/status`,
    }),
    hideError: true,
  });

export const deleteVideoAsset = (assetId: string) =>
  handleReq<{ canceled: boolean }>({
    ...callEndpoint({
      method: "DELETE",
      params: { id: assetId },
      route: `${route}/:id`,
    }),
    hideError: true,
  });

export const cleanupDetachedVideoAsset = async (reference?: string | null) => {
  const assetId = videoAssetIdFromReference(reference);
  if (!assetId) return;

  await deleteVideoAsset(assetId).catch(() => undefined);
};

export const getVideoAssetPlayback = (assetId: string) =>
  handleReq<VideoAssetPlaybackResponse>({
    ...callEndpoint({
      params: { id: assetId },
      route: `${route}/:id/playback`,
    }),
    hideError: true,
    signOutOnUnauthorized: false,
  });
