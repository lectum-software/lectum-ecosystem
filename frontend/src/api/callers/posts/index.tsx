"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  CreatePostReplyPayload,
  PostDeleteResponse,
  PostDetailResponse,
  PostMuteResponse,
  PostRepliesQuery,
  PostRepliesResponse,
  PostReply,
  PostReplyDeleteResponse,
  PostReplyThreadResponse,
  PostReplyUpdateResponse,
  PostReportPayload,
  PostReportResponse,
  PostSaveResponse,
  PostUpdateResponse,
  PostVotePayload,
  PostVoteResponse,
  UpdatePostPayload,
  UpdatePostReplyPayload,
  UserPostsQuery,
} from "@/api/generator/types/posts";
import * as api from "@/api/req/posts";

type VoteValue = 1 | -1 | null;

const invalidateDirectoryPsychologistQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === "directory_psychologist",
  });
};

const clampCount = (value: number) => Math.max(0, value);

const getNextVote = (current: VoteValue, value: 1 | -1): VoteValue => {
  return current === value ? null : value;
};

const applyVoteToCounts = (
  currentVote: VoteValue,
  value: 1 | -1,
  counts: { upvotes_count: number; downvotes_count?: number },
) => {
  const nextVote = getNextVote(currentVote, value);
  const upDelta = (nextVote === 1 ? 1 : 0) - (currentVote === 1 ? 1 : 0);
  const downDelta = (nextVote === -1 ? 1 : 0) - (currentVote === -1 ? 1 : 0);

  return {
    nextVote,
    upvotes_count: clampCount(counts.upvotes_count + upDelta),
    downvotes_count: clampCount((counts.downvotes_count ?? 0) + downDelta),
  };
};

const updateReplyVote = (reply: PostReply, replyId: string, value: 1 | -1): PostReply => {
  const children = reply.replies.map((child) => updateReplyVote(child, replyId, value));

  if (reply.id !== replyId) {
    return {
      ...reply,
      replies: children,
    };
  }

  const next = applyVoteToCounts(reply.current_user_vote, value, {
    upvotes_count: reply.upvotes_count,
    downvotes_count: reply.downvotes_count,
  });

  return {
    ...reply,
    current_user_vote: next.nextVote,
    upvotes_count: next.upvotes_count,
    downvotes_count: next.downvotes_count,
    replies: children,
  };
};

const updateReplyVoteFromResponse = (
  reply: PostReply,
  replyId: string,
  data: PostVoteResponse,
): PostReply => {
  const children = reply.replies.map((child) => updateReplyVoteFromResponse(child, replyId, data));

  if (reply.id !== replyId) {
    return {
      ...reply,
      replies: children,
    };
  }

  return {
    ...reply,
    current_user_vote: data.value,
    upvotes_count: clampCount(data.upvotes_count),
    downvotes_count: clampCount(data.downvotes_count ?? reply.downvotes_count),
    replies: children,
  };
};

const updateReplySaved = (reply: PostReply, replyId: string, saved: boolean): PostReply => ({
  ...reply,
  saved: reply.id === replyId ? saved : reply.saved,
  replies: reply.replies.map((child) => updateReplySaved(child, replyId, saved)),
});

const updateReplyFromResponse = (reply: PostReply, updated: PostReply): PostReply => {
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

export const usePostDetail = (id: string, enabled = true) => {
  return useQuery({
    queryKey: keys.posts.detail(id),
    queryFn: () => api.getPostDetail(id),
    enabled: Boolean(id) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useMyPosts = (query: UserPostsQuery = {}, enabled = true) => {
  return useQuery({
    queryKey: keys.posts.mine(query),
    queryFn: () => api.getMyPosts(query),
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useInfiniteMyPosts = (query: UserPostsQuery = {}, enabled = true) => {
  return useInfiniteQuery({
    queryKey: keys.posts.mine({ ...query, mode: "infinite" }),
    queryFn: ({ pageParam }) => api.getMyPosts({ ...query, page: pageParam as number }),
    initialPageParam: query.page ?? 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useSavedPosts = (query: UserPostsQuery = {}, enabled = true) => {
  return useQuery({
    queryKey: keys.posts.saved(query),
    queryFn: () => api.getSavedPosts(query),
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const usePostReplies = (id: string, query: PostRepliesQuery = {}, enabled = true) => {
  return useQuery({
    queryKey: keys.posts.replies(id, query),
    queryFn: () => api.getPostReplies(id, query),
    enabled: Boolean(id) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const usePostReplyThread = (id: string, replyId: string, enabled = true) => {
  return useQuery({
    queryKey: ["posts", id, "reply-thread", replyId],
    queryFn: () => api.getPostReplyThread(id, replyId),
    enabled: Boolean(id) && Boolean(replyId) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

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
    mutationFn: ({ file, id }: { file: File; id: string }) => api.uploadPostReplyMedia(id, file),
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

export const useVotePost = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PostVotePayload) => api.votePost(postId, body),
    onMutate: async (variables) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: keys.posts.detail(postId) }),
        queryClient.cancelQueries({ queryKey: ["posts", postId, "replies"] }),
        queryClient.cancelQueries({ queryKey: ["posts", postId, "reply-thread"] }),
      ]);

      const previousDetail = queryClient.getQueryData<PostDetailResponse>(
        keys.posts.detail(postId),
      );
      const previousReplies = queryClient.getQueriesData<PostRepliesResponse>({
        queryKey: ["posts", postId, "replies"],
      });
      const previousThreads = queryClient.getQueriesData<PostReplyThreadResponse>({
        queryKey: ["posts", postId, "reply-thread"],
      });

      if (variables.replyId) {
        const replyId = variables.replyId;

        queryClient.setQueriesData<PostRepliesResponse>(
          { queryKey: ["posts", postId, "replies"] },
          (old) => {
            if (!old) return old;

            return {
              ...old,
              data: old.data.map((reply) => updateReplyVote(reply, replyId, variables.value)),
            };
          },
        );
        queryClient.setQueriesData<PostReplyThreadResponse>(
          { queryKey: ["posts", postId, "reply-thread"] },
          (old) => {
            if (!old) return old;

            return {
              ...old,
              reply: updateReplyVote(old.reply, replyId, variables.value),
            };
          },
        );
      } else {
        queryClient.setQueryData<PostDetailResponse>(keys.posts.detail(postId), (old) => {
          if (!old) return old;

          const next = applyVoteToCounts(old.post.current_user_vote, variables.value, {
            upvotes_count: old.post.upvotes_count,
            downvotes_count: old.post.downvotes_count,
          });

          return {
            ...old,
            post: {
              ...old.post,
              current_user_vote: next.nextVote,
              upvotes_count: next.upvotes_count,
              downvotes_count: next.downvotes_count,
            },
          };
        });
      }

      return { previousDetail, previousReplies, previousThreads };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(keys.posts.detail(postId), context.previousDetail);
      }

      context?.previousReplies?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });

      context?.previousThreads?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (data: PostVoteResponse) => {
      if (data.target_type === "post") {
        queryClient.setQueryData<PostDetailResponse>(keys.posts.detail(postId), (old) => {
          if (!old) return old;

          return {
            ...old,
            post: {
              ...old.post,
              current_user_vote: data.value,
              upvotes_count: data.upvotes_count,
              downvotes_count: data.downvotes_count ?? old.post.downvotes_count,
            },
          };
        });
        return;
      }

      if (data.target_type === "reply" && data.reply_id) {
        const replyId = data.reply_id;

        queryClient.setQueriesData<PostRepliesResponse>(
          { queryKey: ["posts", postId, "replies"] },
          (old) => {
            if (!old) return old;

            return {
              ...old,
              data: old.data.map((reply) => updateReplyVoteFromResponse(reply, replyId, data)),
            };
          },
        );
        queryClient.setQueriesData<PostReplyThreadResponse>(
          { queryKey: ["posts", postId, "reply-thread"] },
          (old) => {
            if (!old) return old;

            return {
              ...old,
              reply: updateReplyVoteFromResponse(old.reply, replyId, data),
            };
          },
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(postId) });
      queryClient.invalidateQueries({ queryKey: ["posts", postId, "replies"] });
      queryClient.invalidateQueries({ queryKey: ["posts", postId, "reply-thread"] });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
    },
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
