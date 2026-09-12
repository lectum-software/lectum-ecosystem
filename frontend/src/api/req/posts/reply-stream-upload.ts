import { uploadVideoAsset } from "@/utils/video-asset-upload";

export const uploadReplyVideoToStream = async ({
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
  if (!mimeType.startsWith("video/")) return null;

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
