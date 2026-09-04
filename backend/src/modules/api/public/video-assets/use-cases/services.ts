import { authorizePublicVideoAssetPlayback } from "@/modules/video-assets/service";

export const showPlayback = (assetId: string, viewerId?: string | null) =>
  authorizePublicVideoAssetPlayback(assetId, viewerId);
