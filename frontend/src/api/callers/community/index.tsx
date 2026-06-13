"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  CommunityFeedQuery,
  CommunityListQuery,
  CommunityPostsQuery,
  CommunitySuggestion,
  SuggestCommunityPayload,
} from "@/api/generator/types/community";
import * as api from "@/api/req/community";

export const useCommunities = (query: CommunityListQuery = {}, enabled = true) => {
  return useQuery({
    queryKey: keys.community.list(query),
    queryFn: () => api.getCommunities(query),
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useCommunityFeedPosts = (query: CommunityFeedQuery = {}, enabled = true) => {
  return useQuery({
    queryKey: keys.community.feed(query),
    queryFn: () => api.getCommunityFeedPosts(query),
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useSuggestCommunity = (callbacks?: {
  onSuccess?: (data: CommunitySuggestion) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SuggestCommunityPayload) => api.suggestCommunity(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useCommunityPosts = (
  slug: string,
  query: CommunityPostsQuery = {},
  enabled = true,
) => {
  return useQuery({
    queryKey: keys.community.posts(slug, query),
    queryFn: () => api.getCommunityPosts(slug, query),
    enabled: Boolean(slug) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};
