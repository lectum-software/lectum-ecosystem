"use client";

import {
  mutationOptions,
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { PostReply, PostVotePayload, PostVoteResponse } from "@/api/generator/types/posts";
import * as api from "@/api/req/posts";

import {
  beginPostInteraction,
  commitPostInteraction,
  rollbackPostInteraction,
} from "./interaction-cache";

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

export const createVotePostOptions = (queryClient: QueryClient, postId: string) => {
  return mutationOptions({
    mutationFn: (body: PostVotePayload) => api.votePost(postId, body),
    onMutate: (variables) =>
      beginPostInteraction(
        queryClient,
        { postId, replyId: variables.replyId, kind: "vote" },
        (entity) => {
          const next = applyVoteToCounts(entity.current_user_vote, variables.value, entity);
          return {
            current_user_vote: next.nextVote,
            upvotes_count: next.upvotes_count,
            downvotes_count: next.downvotes_count,
          };
        },
      ),
    onError: (_error, _variables, context) => rollbackPostInteraction(queryClient, context),
    onSuccess: (data: PostVoteResponse, _variables, context) => {
      commitPostInteraction(
        queryClient,
        context,
        {
          current_user_vote: data.value,
          upvotes_count: clampCount(data.upvotes_count),
          ...(data.downvotes_count != null
            ? { downvotes_count: clampCount(data.downvotes_count) }
            : {}),
        },
        data,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.posts.detail(postId) });
      queryClient.invalidateQueries({ queryKey: ["posts", postId, "replies"] });
      queryClient.invalidateQueries({ queryKey: ["posts", postId, "reply-thread"] });
      queryClient.invalidateQueries({ queryKey: keys.community.root() });
      invalidateDirectoryPsychologistQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: keys.posts.mine() });
      queryClient.invalidateQueries({ queryKey: keys.posts.saved() });
    },
  });
};

export const useVotePost = (postId: string) => {
  const queryClient = useQueryClient();
  return useMutation(createVotePostOptions(queryClient, postId));
};
