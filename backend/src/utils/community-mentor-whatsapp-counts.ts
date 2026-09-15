export const COMMUNITY_MENTOR_WHATSAPP_POST_TARGET_TYPES = ["community_post", "post"] as const;
export const COMMUNITY_MENTOR_WHATSAPP_REPLY_TARGET_TYPES = ["post_reply", "reply"] as const;

type AuthoredTarget = {
  id: string;
  author_id: string;
};

type WhatsappClickGroup = {
  target_id: string | null;
  target_type: string | null;
  user_id: string | null;
  _count: { _all: number };
};

// Inputs are scoped, persisted targets and grouped whatsapp_click events, not profile contacts.
export const countCommunityMentorWhatsappClicks = (
  posts: readonly AuthoredTarget[],
  replies: readonly AuthoredTarget[],
  groups: readonly WhatsappClickGroup[],
): Map<string, number> => {
  const postAuthors = new Map(posts.map((post) => [post.id, post.author_id]));
  const replyAuthors = new Map(replies.map((reply) => [reply.id, reply.author_id]));
  const counts = new Map<string, number>();

  for (const group of groups) {
    if (!group.target_id) continue;

    const authorId =
      group.target_type === "community_post" || group.target_type === "post"
        ? postAuthors.get(group.target_id)
        : group.target_type === "post_reply" || group.target_type === "reply"
          ? replyAuthors.get(group.target_id)
          : undefined;

    // A different mentor is still a third-party actor; only this target's author is excluded.
    if (!authorId || group.user_id === authorId) continue;
    counts.set(authorId, (counts.get(authorId) ?? 0) + group._count._all);
  }

  return counts;
};
