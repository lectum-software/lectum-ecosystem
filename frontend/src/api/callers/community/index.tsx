"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  CommunityFeedQuery,
  CommunityListQuery,
  CommunityMembershipResponse,
  CommunityPost,
  CommunityPostsQuery,
  CommunitySuggestion,
  CommunityTopMentorsQuery,
  CreateCommunityPostPayload,
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

export const useCommunityTopMentors = (query: CommunityTopMentorsQuery = {}, enabled = true) => {
  return useQuery({
    queryKey: keys.community.topMentors(query),
    queryFn: () => api.getCommunityTopMentors(query),
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useCommunityDetail = (slug: string, enabled = true) => {
  return useQuery({
    queryKey: keys.community.detail(slug),
    queryFn: () => api.getCommunityDetail(slug),
    enabled: Boolean(slug) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useFollowCommunity = (callbacks?: {
  onSuccess?: (data: CommunityMembershipResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => api.followCommunity(slug),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      queryClient.invalidateQueries({ queryKey: keys.community.detail(data.community.slug) });
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useUnfollowCommunity = (callbacks?: {
  onSuccess?: (data: CommunityMembershipResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => api.unfollowCommunity(slug),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      queryClient.invalidateQueries({ queryKey: keys.community.detail(data.community.slug) });
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
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

export const useCreateCommunityPost = (callbacks?: {
  onSuccess?: (data: CommunityPost) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, body }: { slug: string; body: CreateCommunityPostPayload }) =>
      api.createCommunityPost(slug, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};
