"use client";

import { useQuery } from "@tanstack/react-query";
import { adminVideoAssetsKeys } from "@/api/cache/keys";
import { getAdminVideoAssetPlayback } from "@/api/req/video-assets";
import { videoAssetIdFromAdminReference } from "@/lib/admin-media";

export const useAdminVideoAssetPlayback = (reference?: string | null, enabled = true) => {
  const assetId = videoAssetIdFromAdminReference(reference);

  return useQuery({
    enabled: Boolean(assetId) && enabled,
    gcTime: 30 * 60 * 1_000,
    queryFn: () => {
      if (!assetId) throw new Error("video_asset_reference_invalid");
      return getAdminVideoAssetPlayback(assetId);
    },
    queryKey: adminVideoAssetsKeys.playback(assetId),
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 20 * 60 * 1_000,
  });
};
