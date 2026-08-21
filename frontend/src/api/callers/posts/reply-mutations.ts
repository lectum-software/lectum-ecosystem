"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  CreatePostReplyPayload,
  PostRepliesResponse,
  PostReply,
  PostReplyDeleteResponse,
  PostReplyThreadResponse,
  PostReplyUpdateResponse,
  PostReportPayload,
  PostReportResponse,
  PostSaveResponse,
  PostSharePayload,
  PostShareResponse,
  UpdatePostReplyPayload,
} from "@/api/generator/types/posts";
import * as api from "@/api/req/posts";
import {
  type MediaPreparationPurpose,
  type MediaUploadProgress,
  prepareUpload,
  resolvePostReplyPreparationPurpose,
} from "@/utils/media-preparation";

import { invalidateDirectoryPsychologistQueries } from "./queries";

export const updateReplySaved = (reply: PostReply, replyId: string, saved: boolean): PostReply => ({
  ...reply,
  saved: reply.id === replyId ? saved : reply.saved,
  replies: reply.replies.map((child) => updateReplySaved(child, replyId, saved)),
});

export const updateReplyFromResponse = (reply: PostReply, updated: PostReply): PostReply => {
  const children = reply.replies.map((child) => updateReplyFromResponse(child, updated));

  if (reply.id !== updated.id) {
    return {
      ...reply,
      replies: children,
    };
  }

  return {
    ...reply,
    ...updated,
    replies: children.length > 0 ? children : updated.replies,
  };
};

export const useUnsaveReplyFromList = (callbacks?: {
  onSuccess?: (data: PostSaveResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, replyId }: { postId: string; replyId: string }) =>
      api.unsaveReply(postId, replyId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.posts.saved() });
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(data.post_id) });
      queryClient.invalidateQueries({ queryKey: keys.posts.replies(data.post_id) });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useCreatePostReply = (callbacks?: {
  onSuccess?: (data: PostReply) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreatePostReplyPayload }) =>
      api.createPostReply(id, body),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["posts", variables.id, "replies"] });
      queryClient.invalidateQueries({ queryKey: ["posts", variables.id, "reply-thread"] });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useUploadPostReplyMedia = (callbacks?: { onError?: (error: unknown) => void }) => {
  return useMutation({
    mutationFn: async ({
      file,
      id,
      onProgress,
      purpose,
      signal,
    }: {
      file: File;
      id: string;
      onProgress?: (progress: MediaUploadProgress) => void;
      purpose?: Extract<
        MediaPreparationPurpose,
        "generated-video-thumbnail" | "post-reply-image" | "post-reply-video"
      >;
      signal?: AbortSignal;
    }) => {
      const prepared = await prepareUpload({
        file,
        onProgress: (progress) => onProgress?.({ ...progress, phase: "preparing" }),
        purpose: purpose ?? resolvePostReplyPreparationPurpose(file),
        signal,
      });
      return api.uploadPostReplyMedia(
        id,
        prepared.file,
        (percentage) => onProgress?.({ percentage, phase: "uploading", stage: "uploading" }),
        signal,
      );
    },
    onError: callbacks?.onError,
  });
};

export const useUpdatePostReply = (callbacks?: {
  onSuccess?: (data: PostReplyUpdateResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      body,
      postId,
      replyId,
    }: {
      body: UpdatePostReplyPayload;
      postId: string;
      replyId: string;
    }) => api.updatePostReply(postId, replyId, body),
    onSuccess: (data, variables) => {
      queryClient.setQueriesData<PostRepliesResponse>(
        { queryKey: ["posts", variables.postId, "replies"] },
        (old) => {
          if (!old) return old;

          return {
            ...old,
            data: old.data.map((reply) => updateReplyFromResponse(reply, data)),
          };
        },
      );
      queryClient.setQueriesData<PostReplyThreadResponse>(
        { queryKey: ["posts", variables.postId, "reply-thread"] },
        (old) => {
          if (!old) return old;

          return {
            ...old,
            reply: updateReplyFromResponse(old.reply, data),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(variables.postId) });
      queryClient.invalidateQueries({ queryKey: ["posts", variables.postId, "replies"] });
      queryClient.invalidateQueries({ queryKey: ["posts", variables.postId, "reply-thread"] });
      queryClient.invalidateQueries({ queryKey: keys.posts.mine() });
      queryClient.invalidateQueries({ queryKey: keys.posts.saved() });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useReportReply = (callbacks?: {
  onSuccess?: (data: PostReportResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  return useMutation({
    mutationFn: ({ body, id, replyId }: { body: PostReportPayload; id: string; replyId: string }) =>
      api.reportReply(id, replyId, body),
    onSuccess: (data) => {
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useShareReply = (callbacks?: {
  onSuccess?: (data: PostShareResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  return useMutation({
    mutationFn: ({
      body = {},
      postId,
      replyId,
    }: {
      body?: Omit<PostSharePayload, "replyId">;
      postId: string;
      replyId: string;
    }) => api.shareReply(postId, replyId, body),
    onError: callbacks?.onError,
    onSuccess: callbacks?.onSuccess,
  });
};

export const useDeleteReply = (callbacks?: {
  onSuccess?: (data: PostReplyDeleteResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, replyId }: { postId: string; replyId: string }) =>
      api.deleteReply(postId, replyId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(variables.postId) });
      queryClient.invalidateQueries({ queryKey: ["posts", variables.postId, "replies"] });
      queryClient.invalidateQueries({ queryKey: ["posts", variables.postId, "reply-thread"] });
      queryClient.invalidateQueries({ queryKey: keys.posts.mine() });
      queryClient.invalidateQueries({ queryKey: keys.posts.saved() });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useSaveReply = (postId: string, replyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (saved: boolean) =>
      saved ? api.unsaveReply(postId, replyId) : api.saveReply(postId, replyId),
    onMutate: async (saved) => {
      await queryClient.cancelQueries({ queryKey: ["posts", postId, "replies"] });
      await queryClient.cancelQueries({ queryKey: ["posts", postId, "reply-thread"] });
      const previousReplies = queryClient.getQueriesData<PostRepliesResponse>({
        queryKey: ["posts", postId, "replies"],
      });
      const previousThreads = queryClient.getQueriesData<PostReplyThreadResponse>({
        queryKey: ["posts", postId, "reply-thread"],
      });
      const nextSaved = !saved;

      queryClient.setQueriesData<PostRepliesResponse>(
        { queryKey: ["posts", postId, "replies"] },
        (old) => {
          if (!old) return old;

          return {
            ...old,
            data: old.data.map((reply) => updateReplySaved(reply, replyId, nextSaved)),
          };
        },
      );

      queryClient.setQueriesData<PostReplyThreadResponse>(
        { queryKey: ["posts", postId, "reply-thread"] },
        (old) => {
          if (!old) return old;

          return {
            ...old,
            reply: updateReplySaved(old.reply, replyId, nextSaved),
          };
        },
      );

      return { previousReplies, previousThreads };
    },
    onError: (_error, _variables, context) => {
      context?.previousReplies?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });

      context?.previousThreads?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (data: PostSaveResponse) => {
      if (data.target_type !== "reply" || !data.reply_id) return;
      const replyId = data.reply_id;

      queryClient.setQueriesData<PostRepliesResponse>(
        { queryKey: ["posts", postId, "replies"] },
        (old) => {
          if (!old) return old;

          return {
            ...old,
            data: old.data.map((reply) => updateReplySaved(reply, replyId, data.saved)),
          };
        },
      );
      queryClient.setQueriesData<PostReplyThreadResponse>(
        { queryKey: ["posts", postId, "reply-thread"] },
        (old) => {
          if (!old) return old;

          return {
            ...old,
            reply: updateReplySaved(old.reply, replyId, data.saved),
          };
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", postId, "replies"] });
      queryClient.invalidateQueries({ queryKey: ["posts", postId, "reply-thread"] });
      queryClient.invalidateQueries({ queryKey: keys.posts.saved() });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
    },
  });
};
