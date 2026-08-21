"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  CommunityFeedQuery,
  CommunityListQuery,
  CommunityMembershipResponse,
  CommunityPost,
  CommunityPostMediaUploadResponse,
  CommunityPostsQuery,
  CommunitySuggestion,
  CommunityTopMentorsQuery,
  CreateCommunityPostPayload,
  SuggestCommunityPayload,
} from "@/api/generator/types/community";
import * as api from "@/api/req/community";
import {
  type MediaPreparationPurpose,
  type MediaUploadProgress,
  prepareUpload,
  resolveCommunityPostPreparationPurpose,
} from "@/utils/media-preparation";

const invalidateDirectoryPsychologistQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === "directory_psychologist",
  });
};

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

export const useInfiniteCommunityFeedPosts = (query: CommunityFeedQuery = {}, enabled = true) => {
  return useInfiniteQuery({
    queryKey: keys.community.feed({ ...query, mode: "infinite" }),
    queryFn: ({ pageParam }) => api.getCommunityFeedPosts({ ...query, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
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
      queryClient.invalidateQueries({ queryKey: keys.posts.root() });
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
      queryClient.invalidateQueries({ queryKey: keys.posts.root() });
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

export const useInfiniteCommunityPosts = (
  slug: string,
  query: CommunityPostsQuery = {},
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: keys.community.posts(slug, { ...query, mode: "infinite" }),
    queryFn: ({ pageParam }) =>
      api.getCommunityPosts(slug, { ...query, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
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
      invalidateDirectoryPsychologistQueries(queryClient);
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useUploadCommunityPostMedia = (callbacks?: {
  onError?: (error: unknown) => void;
  onSuccess?: (data: CommunityPostMediaUploadResponse) => void;
}) => {
  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
      purpose,
      signal,
      slug,
    }: {
      file: File;
      onProgress?: (progress: MediaUploadProgress) => void;
      purpose?: Extract<
        MediaPreparationPurpose,
        "community-post-image" | "community-post-video" | "generated-video-thumbnail"
      >;
      signal?: AbortSignal;
      slug: string;
    }) => {
      const prepared = await prepareUpload({
        file,
        onProgress: (progress) => onProgress?.({ ...progress, phase: "preparing" }),
        purpose: purpose ?? resolveCommunityPostPreparationPurpose(file),
        signal,
      });
      return api.uploadCommunityPostMedia(
        slug,
        prepared.file,
        (percentage) => onProgress?.({ percentage, phase: "uploading", stage: "uploading" }),
        signal,
      );
    },
    onError: callbacks?.onError,
    onSuccess: callbacks?.onSuccess,
  });
};
