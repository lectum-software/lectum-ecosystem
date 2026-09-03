import { uploadVideoAsset } from "@/utils/video-asset-upload";
import { isCloudflareStreamUploadEnabled } from "@/utils/video-stream";

export const uploadReplyVideoToStreamWhenEnabled = async ({
  file,
  mimeType,
  onProgress,
  postId,
  signal,
}: {
  file: File;
  mimeType: string;
  onProgress?: (percentage: number) => void;
  postId: string;
  signal?: AbortSignal;
}) => {
  if (!isCloudflareStreamUploadEnabled() || !mimeType.startsWith("video/")) return null;

  const uploaded = await uploadVideoAsset({
    contextId: postId,
    file,
    onProgress,
    purpose: "community_reply",
    signal,
  });
  return {
    media_type: "video" as const,
    media_url: uploaded.media_url,
  };
};
