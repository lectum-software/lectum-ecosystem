import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import type { CommunityPostSortMetricsDTO } from "../../DTOs/ICommunityDTO";
import type { PostResult, ProfessionalReplyResult } from "./community-feed";

export const FEATURED_ACTIVITY_HALF_LIFE_DAYS = 14;

export const featuredActivityDecay = (createdAt: Date, now: number) => {
  const age = Math.max(0, (now - createdAt.getTime()) / 86_400_000);
  return Number.isFinite(age) ? 2 ** (-age / FEATURED_ACTIVITY_HALF_LIFE_DAYS) : 0;
};

export const isDirectVerifiedProfessionalReply = (reply: ProfessionalReplyResult) =>
  reply.parent_reply_id === null &&
  !reply.author.deleted &&
  reply.author.role === "psicologo" &&
  isVerifiedProfessionalEntitlement(reply.author.psychologist_profile);

export const professionalActivityScore = (replies: ProfessionalReplyResult[], now: number) => {
  const latestByProfessional = new Map<string, number>();
  let activity = 0;
  for (const reply of replies) {
    if (!isDirectVerifiedProfessionalReply(reply)) continue;
    const decay = featuredActivityDecay(reply.createdAt, now);
    activity += 30 * decay;
    latestByProfessional.set(
      reply.author.id,
      Math.max(latestByProfessional.get(reply.author.id) ?? 0, decay),
    );
  }
  for (const decay of latestByProfessional.values()) activity += 10 * decay;
  return activity;
};

export const featuredPostScore = (
  post: PostResult,
  metrics: CommunityPostSortMetricsDTO,
  now: number,
) => {
  const engagement = Math.max(
    0,
    metrics.upvotes.all * 3 + metrics.comments.all + metrics.shares_count * 2,
  );
  const complement = Math.min(10, Math.log2(1 + engagement));
  const penalty = Math.max(0, metrics.penalty) + Math.max(0, post.downvotes_count) * 0.6;
  return Math.max(
    0,
    professionalActivityScore(post.replies, now) +
      (complement - penalty) * featuredActivityDecay(post.createdAt, now),
  );
};
