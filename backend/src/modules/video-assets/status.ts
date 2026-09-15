import type { VideoAssetStatus } from "@/infra/video-stream";

export const mutableVideoAssetStatusesFor = (nextStatus: VideoAssetStatus): VideoAssetStatus[] => {
  if (nextStatus === "uploading") return ["uploading"];
  if (nextStatus === "processing") return ["uploading", "processing"];
  if (nextStatus === "ready") return ["uploading", "processing", "error", "ready"];
  if (nextStatus === "error") return ["uploading", "processing", "error"];
  return [];
};
