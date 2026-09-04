"use client";

import { useQuery } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import { getVideoAssetPlayback } from "@/api/req/video-assets";
import { useAppSelector } from "@/hooks/redux";
import { videoAssetIdFromReference } from "@/utils/video-stream";

export const useVideoAssetPlayback = (reference?: string | null, enabled = true) => {
  const assetId = videoAssetIdFromReference(reference);
  const viewerId = useAppSelector((state) => state.user?.id ?? null);

  return useQuery({
    enabled: Boolean(assetId) && enabled,
    gcTime: 30 * 60 * 1_000,
    queryFn: () => {
      if (!assetId) throw new Error("video_asset_reference_invalid");
      return getVideoAssetPlayback(assetId);
    },
    queryKey: keys.videoAssets.playback(assetId, viewerId),
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 20 * 60 * 1_000,
  });
};
