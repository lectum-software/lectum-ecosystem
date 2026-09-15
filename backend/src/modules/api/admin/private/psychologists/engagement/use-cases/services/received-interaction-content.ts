type ReceivedInteractionPost = {
  community: { id: string };
  id: string;
};

type ReceivedInteractionReply = {
  id: string;
  post: { community: { id: string } };
};

export const selectReceivedInteractionContentIds = (input: {
  allPosts: readonly ReceivedInteractionPost[];
  allReplies: readonly ReceivedInteractionReply[];
  communityFilterIds: ReadonlySet<string> | null;
}) => {
  const matchesCommunity = (id: string) =>
    input.communityFilterIds === null || input.communityFilterIds.has(id);

  // Eligibility comes from the authored-content queries; only the received event
  // is bounded by the current/previous period, not its content's creation date.
  return {
    postIds: input.allPosts
      .filter((post) => matchesCommunity(post.community.id))
      .map((post) => post.id),
    replyIds: input.allReplies
      .filter((reply) => matchesCommunity(reply.post.community.id))
      .map((reply) => reply.id),
  };
};
