import type { video_asset } from "@/external/generated/prisma/client";
import type { VideoAssetPurpose, VideoAssetStatus } from "@/infra/video-stream";

export type VideoAssetRecord = video_asset;

export type VideoAssetAssociationInput = {
  contextId: string;
  ownerId: string;
  purpose: VideoAssetPurpose;
  reference: string;
};

export type VideoAssetProviderUpdate = {
  durationSeconds: number | null;
  errorCode: string | null;
  height: number | null;
  status: VideoAssetStatus;
  width: number | null;
};

export type ProfileVideoAssetAttachment = {
  attached: boolean;
  previousVideoCoverUrl: string | null;
  previousVideoUrl: string | null;
  retiredProviderUids: string[];
};
