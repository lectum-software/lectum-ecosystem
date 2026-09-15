import { authorizeAdminVideoAssetPlayback } from "@/modules/video-assets/service";

export const playback = (assetId: string) => authorizeAdminVideoAssetPlayback(assetId);
