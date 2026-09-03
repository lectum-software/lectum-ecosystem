import type { VideoAssetPurpose } from "@/infra/video-stream";
import type { user } from "@/interfaces/objects";

export interface IVideoAssetUploadDTO {
  auth: user;
  b: {
    contextId?: string | null;
    mimeType: string;
    purpose: VideoAssetPurpose;
    size: number;
  };
}

export interface IVideoAssetActionDTO {
  auth: user;
  p: {
    id: string;
  };
}
