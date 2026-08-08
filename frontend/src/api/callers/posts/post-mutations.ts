"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  PostDeleteResponse,
  PostDetailResponse,
  PostMuteResponse,
  PostReportPayload,
  PostReportResponse,
  PostSaveResponse,
  PostSharePayload,
  PostShareResponse,
  PostUpdateResponse,
  UpdatePostPayload,
} from "@/api/generator/types/posts";
import * as api from "@/api/req/posts";

import { invalidateDirectoryPsychologistQueries } from "./queries";

import { clampCount } from "./vote";

export const useUnsavePostFromList = (callbacks?: {
  onSuccess?: (data: PostSaveResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.unsavePost(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: keys.posts.saved() });
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(id) });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useUpdatePost = (callbacks?: {
  onSuccess?: (data: PostUpdateResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, id }: { body: UpdatePostPayload; id: string }) => api.updatePost(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData<PostDetailResponse>(keys.posts.detail(data.id), (old) => {
        if (!old) return { post: data };

        return {
          ...old,
          post: data,
        };
      });
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: keys.posts.mine() });
      queryClient.invalidateQueries({ queryKey: keys.posts.saved() });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useReportPost = (callbacks?: {
  onSuccess?: (data: PostReportResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  return useMutation({
    mutationFn: ({ body, id }: { body: PostReportPayload; id: string }) => api.reportPost(id, body),
    onSuccess: (data) => {
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useSharePost = (callbacks?: {
  onSuccess?: (data: PostShareResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  return useMutation({
    mutationFn: ({ body = {}, id }: { body?: PostSharePayload; id: string }) =>
      api.sharePost(id, body),
    onError: callbacks?.onError,
    onSuccess: callbacks?.onSuccess,
  });
};

export const useSavePost = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (saved: boolean) => (saved ? api.unsavePost(postId) : api.savePost(postId)),
    onMutate: async (saved) => {
      await queryClient.cancelQueries({ queryKey: keys.posts.detail(postId) });
      const previousDetail = queryClient.getQueryData<PostDetailResponse>(
        keys.posts.detail(postId),
      );

      queryClient.setQueryData<PostDetailResponse>(keys.posts.detail(postId), (old) => {
        if (!old) return old;

        const nextSaved = !saved;
        const delta = nextSaved ? 1 : -1;

        return {
          ...old,
          post: {
            ...old.post,
            saved: nextSaved,
            saves_count: clampCount(old.post.saves_count + delta),
          },
        };
      });

      return { previousDetail };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(keys.posts.detail(postId), context.previousDetail);
      }
    },
    onSuccess: (data: PostSaveResponse) => {
      queryClient.setQueryData<PostDetailResponse>(keys.posts.detail(postId), (old) => {
        if (!old) return old;

        return {
          ...old,
          post: {
            ...old.post,
            saved: data.saved,
            saves_count: data.saves_count ?? old.post.saves_count,
          },
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(postId) });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
    },
  });
};

export const useMutePost = (callbacks?: {
  onSuccess?: (data: PostMuteResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ muted, postId }: { muted: boolean; postId: string }) =>
      muted ? api.unmutePost(postId) : api.mutePost(postId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(data.post_id) });
      queryClient.invalidateQueries({ queryKey: keys.posts.mine() });
      queryClient.invalidateQueries({ queryKey: keys.posts.saved() });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useDeletePost = (callbacks?: {
  onSuccess?: (data: PostDeleteResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => api.deletePost(postId),
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: keys.posts.detail(data.post_id) });
      queryClient.invalidateQueries({ queryKey: keys.posts.mine() });
      queryClient.invalidateQueries({ queryKey: keys.posts.saved() });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};
