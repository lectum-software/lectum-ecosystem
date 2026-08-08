"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  PostDetailResponse,
  PostRepliesResponse,
  PostReply,
  PostReplyThreadResponse,
  PostVotePayload,
  PostVoteResponse,
} from "@/api/generator/types/posts";
import * as api from "@/api/req/posts";

import { invalidateDirectoryPsychologistQueries } from "./queries";

export type VoteValue = 1 | -1 | null;

export const clampCount = (value: number) => Math.max(0, value);

export const getNextVote = (current: VoteValue, value: 1 | -1): VoteValue => {
  return current === value ? null : value;
};

export const applyVoteToCounts = (
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

export const updateReplyVote = (reply: PostReply, replyId: string, value: 1 | -1): PostReply => {
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

export const updateReplyVoteFromResponse = (
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
