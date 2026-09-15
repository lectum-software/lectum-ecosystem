import { diagnoseAdminCommunityEngagement } from "@/utils/admin-community-engagement-diagnosis";
import type {
  AdminPatientDetailActivityItem,
  AdminPatientDetailCommunity,
} from "../../DTOs/IAdminPatientDetailDTO";
import type { AdminPatientEngagementBundle } from "../../repositories/AdminPatientDetailRepository";
import type { CommunityLike } from "./intent";
import { postUrl, replyUrl, snippet, voteTargetTitle, voteTargetUrl } from "./metrics-series";

export const activityFromPost = (
  post: AdminPatientEngagementBundle["posts"][number],
): AdminPatientDetailActivityItem => ({
  description: `Criou um post na comunidade ${post.community.name}: ${snippet(post.content, "sem conteúdo textual")}.`,
  detail_url: postUrl(post),
  id: `post-${post.id}`,
  occurred_at: post.createdAt,
  source: "community_post",
  title: post.title,
  type: "post_created",
});

export const activityFromReply = (
  reply: AdminPatientEngagementBundle["replies"][number],
): AdminPatientDetailActivityItem => ({
  description: `Comentou no post "${reply.post.title}": ${snippet(reply.content, "comentário sem texto")}.`,
  detail_url: replyUrl(reply),
  id: `reply-${reply.id}`,
  occurred_at: reply.createdAt,
  source: "post_reply",
  title: "Comentou em um post",
  type: "post_reply_created",
});

export const activityFromVote = (
  vote: AdminPatientEngagementBundle["votesMade"][number],
): AdminPatientDetailActivityItem => ({
  description: `Registrou ${vote.value > 0 ? "upvote" : "downvote"} em "${voteTargetTitle(vote)}".`,
  detail_url: voteTargetUrl(vote),
  id: `vote-${vote.id}`,
  occurred_at: vote.createdAt,
  source: "post_vote",
  title: vote.value > 0 ? "Upvote realizado" : "Downvote realizado",
  type: "post_vote",
});

export const activityFromPostSave = (
  save: AdminPatientEngagementBundle["postSaves"][number],
): AdminPatientDetailActivityItem => ({
  description: `Salvou o post "${save.post.title}".`,
  detail_url: postUrl(save.post),
  id: `post-save-${save.id}`,
  occurred_at: save.createdAt,
  source: "post_save",
  title: "Salvou um post",
  type: "post_saved",
});

export const activityFromReplySave = (
  save: AdminPatientEngagementBundle["replySaves"][number],
): AdminPatientDetailActivityItem => ({
  description: `Salvou uma resposta no post "${save.reply.post.title}".`,
  detail_url: replyUrl(save.reply),
  id: `reply-save-${save.id}`,
  occurred_at: save.createdAt,
  source: "post_reply_save",
  title: "Salvou uma resposta",
  type: "post_reply_saved",
});

export const activityFromMembership = (
  member: AdminPatientEngagementBundle["membershipsInPeriod"][number],
): AdminPatientDetailActivityItem => ({
  description: `Entrou na comunidade ${member.community.name}.`,
  detail_url: `/comunidades/${member.community.slug}`,
  id: `member-${member.id}`,
  occurred_at: member.createdAt,
  source: "community_member",
  title: "Entrou em comunidade",
  type: "community_joined",
});

export const activityFromReview = (
  review: AdminPatientEngagementBundle["reviews"][number],
): AdminPatientDetailActivityItem => ({
  description: `Criou uma avaliação profissional com nota ${review.rating}. O comentário não é exibido nesta visão operacional.`,
  detail_url: null,
  id: `review-${review.id}`,
  occurred_at: review.createdAt,
  source: "professional_review",
  title: "Avaliação criada",
  type: "professional_review_created",
});

export const buildActivities = (bundle: AdminPatientEngagementBundle) =>
  [
    ...bundle.posts.map(activityFromPost),
    ...bundle.replies.map(activityFromReply),
    ...bundle.votesMade.map(activityFromVote),
    ...bundle.postSaves.map(activityFromPostSave),
    ...bundle.replySaves.map(activityFromReplySave),
    ...bundle.membershipsInPeriod.map(activityFromMembership),
    ...bundle.reviews.map(activityFromReview),
  ]
    .sort((left, right) => right.occurred_at.getTime() - left.occurred_at.getTime())
    .slice(0, 10);

export const communityFromPost = (post: AdminPatientEngagementBundle["posts"][number]) =>
  post.community;

export const communityFromReply = (reply: AdminPatientEngagementBundle["replies"][number]) =>
  reply.post.community;

export const communityFromVote = (vote: AdminPatientEngagementBundle["votesMade"][number]) =>
  vote.post?.community ?? vote.reply?.post.community ?? null;

export const communityFromPostSave = (save: AdminPatientEngagementBundle["postSaves"][number]) =>
  save.post.community;

export const communityFromReplySave = (save: AdminPatientEngagementBundle["replySaves"][number]) =>
  save.reply.post.community;

export const upsertCommunity = (
  acc: Map<string, AdminPatientDetailCommunity>,
  community: CommunityLike,
  increment = 0,
) => {
  const current =
    acc.get(community.id) ??
    ({
      avatar_url: community.avatar_url,
      comments: 0,
      color: community.visual_primary_color,
      downvotes: 0,
      engagement_diagnosis: diagnoseAdminCommunityEngagement({
        interactions: 0,
        source: "community_post+post_reply+post_vote+post_save+post_reply_save",
      }),
      id: community.id,
      interactions: 0,
      is_member: false,
      member_since: null,
      name: community.name,
      posts: 0,
      saves: 0,
      slug: community.slug,
      upvotes: 0,
      votes: 0,
    } satisfies AdminPatientDetailCommunity);

  current.interactions += increment;
  acc.set(community.id, current);
  return current;
};

export const buildActiveCommunities = (bundle: AdminPatientEngagementBundle) => {
  const communities = new Map<string, AdminPatientDetailCommunity>();

  for (const member of bundle.memberships) {
    const item = upsertCommunity(communities, member.community, 0);
    item.is_member = true;
    item.member_since = member.createdAt;
  }
  for (const post of bundle.posts) {
    const item = upsertCommunity(communities, communityFromPost(post), 1);
    item.posts += 1;
  }
  for (const reply of bundle.replies) {
    const item = upsertCommunity(communities, communityFromReply(reply), 1);
    item.comments += 1;
  }
  for (const vote of bundle.votesMade) {
    const community = communityFromVote(vote);
    if (community) {
      const item = upsertCommunity(communities, community, 1);
      if (vote.value > 0) item.upvotes += 1;
      if (vote.value < 0) item.downvotes += 1;
      item.votes += 1;
    }
  }
  for (const save of bundle.postSaves) {
    const item = upsertCommunity(communities, communityFromPostSave(save), 1);
    item.saves += 1;
  }
  for (const save of bundle.replySaves) {
    const item = upsertCommunity(communities, communityFromReplySave(save), 1);
    item.saves += 1;
  }

  const activeCommunities = [...communities.values()].filter(
    (community) => community.interactions > 0,
  );
  return activeCommunities
    .map((community) => ({
      ...community,
      engagement_diagnosis: diagnoseAdminCommunityEngagement({
        interactions: community.interactions,
        source: "community_post+post_reply+post_vote+post_save+post_reply_save",
      }),
    }))
    .sort((left, right) => {
      if (right.interactions !== left.interactions) return right.interactions - left.interactions;
      if (Number(right.is_member) !== Number(left.is_member)) {
        return Number(right.is_member) - Number(left.is_member);
      }

      return left.name.localeCompare(right.name, "pt-BR");
    })
    .slice(0, 5);
};
