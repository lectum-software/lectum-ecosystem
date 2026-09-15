import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type AdminVideoAssetPlayback = {
  expires_at: string;
  hls_url: string;
  thumbnail_url: string;
};

export const getAdminVideoAssetPlayback = async (assetId: string) => {
  const response = await adminApi.get<ApiResponse<AdminVideoAssetPlayback>>(
    `/api/admin/private/video-assets/${encodeURIComponent(assetId)}/playback`,
  );

  return resolveApiData(response.data);
};
