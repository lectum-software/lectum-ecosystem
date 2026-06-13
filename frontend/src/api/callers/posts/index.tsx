"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  CreatePostReplyPayload,
  PostDetailResponse,
  PostRepliesQuery,
  PostRepliesResponse,
  PostReply,
  PostSaveResponse,
  PostVotePayload,
  PostVoteResponse,
} from "@/api/generator/types/posts";
import * as api from "@/api/req/posts";

type VoteValue = 1 | -1 | null;

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
  });

  return {
    ...reply,
    current_user_vote: next.nextVote,
    upvotes_count: next.upvotes_count,
    replies: children,
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

export const usePostReplies = (id: string, query: PostRepliesQuery = {}, enabled = true) => {
  return useQuery({
    queryKey: keys.posts.replies(id, query),
    queryFn: () => api.getPostReplies(id, query),
    enabled: Boolean(id) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
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
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
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
      ]);

      const previousDetail = queryClient.getQueryData<PostDetailResponse>(
        keys.posts.detail(postId),
      );
      const previousReplies = queryClient.getQueriesData<PostRepliesResponse>({
        queryKey: ["posts", postId, "replies"],
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

      return { previousDetail, previousReplies };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(keys.posts.detail(postId), context.previousDetail);
      }

      context?.previousReplies?.forEach(([queryKey, data]) => {
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
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(postId) });
      queryClient.invalidateQueries({ queryKey: ["posts", postId, "replies"] });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
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
            saves_count: data.saves_count,
          },
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(postId) });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
    },
  });
};
