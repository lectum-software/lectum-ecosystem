"use client";

import { useState } from "react";
import { useCommunityRecommendationCandidates } from "@/api/callers/community";
import type { Community } from "@/api/generator/types/community";
import { useAppSelector } from "@/hooks/redux";
import {
  refreshCommunityRecommendations,
  selectCommunityRecommendations,
} from "./community-recommendations";

export const useCommunityRecommendations = (
  enabled: boolean,
  current?: Pick<Community, "slug" | "category">,
) => {
  const viewerId = useAppSelector((state) => state.user?.id) ?? "guest";
  const query = useCommunityRecommendationCandidates(viewerId, enabled);
  const scope = `${viewerId}:${current?.slug ?? "home"}`;
  const [selection, setSelection] = useState<{ scope: string; slugs: string[] } | null>(null);
  const selected = selection?.scope === scope ? selection : null;
  if (enabled && query.isSuccess && !query.isFetching && !selected) {
    setSelection({
      scope,
      slugs: selectCommunityRecommendations(query.data.data, current).map((item) => item.slug),
    });
  }
  return selected && query.data && !query.isError
    ? refreshCommunityRecommendations(selected.slugs, query.data.data)
    : [];
};
