export const VIDEO_ASSET_PURPOSES = [
  "profile_presentation",
  "community_post",
  "community_reply",
] as const;

export type VideoAssetPurpose = (typeof VIDEO_ASSET_PURPOSES)[number];
export type VideoAssetStatus = "canceled" | "error" | "processing" | "ready" | "uploading";

export type VideoStreamDetails = {
  durationSeconds: number | null;
  errorCode: string | null;
  height: number | null;
  providerUid: string;
  status: VideoAssetStatus;
  width: number | null;
};

export type ProvisionVideoUploadInput = {
  assetId: string;
  expiresAt: Date;
  maxDurationSeconds: number;
  purpose: VideoAssetPurpose;
  sizeBytes: number;
};

export type ProvisionedVideoUpload = {
  providerUid: string;
  uploadUrl: string;
};

export type SignedVideoPlayback = {
  expiresAt: Date;
  hlsUrl: string;
  thumbnailUrl: string;
};
