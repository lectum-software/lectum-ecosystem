export type VideoAssetPurpose = "profile_presentation" | "community_post" | "community_reply";

export type VideoAssetStatus = "uploading" | "processing" | "ready" | "error" | "canceled";

export type VideoAssetUploadRequest = {
  contextId?: string;
  mimeType: string;
  purpose: VideoAssetPurpose;
  size: number;
};

export type VideoAssetUploadResponse = {
  asset_id: string;
  expires_at: string;
  max_file_size: number;
  status: "uploading";
  upload_url: string;
};

export type VideoAssetStatusResponse = {
  asset_id: string;
  duration_seconds: number | null;
  height: number | null;
  media_url: string | null;
  status: VideoAssetStatus;
  width: number | null;
};

export type VideoAssetPlaybackResponse = {
  expires_at: string;
  hls_url: string;
  thumbnail_url: string;
};
