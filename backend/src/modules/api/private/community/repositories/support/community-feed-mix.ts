import { videoAssetIdFromReference } from "@/infra/video-stream/reference";
import { publicFileKeyFromUrl } from "@/utils/public-origin";
import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import type { CommunityPostSortMetricsDTO } from "../../DTOs/ICommunityDTO";
import { featuredActivityDecay } from "./community-featured";
import {
  communityPostMetrics,
  compareCommunityPostDates,
  type PostResult,
  sortGeneralFeedPostResults,
} from "./community-feed";
import { hasFeedVideoReply, type ReadyFeedVideoAsset } from "./community-feed-eligibility";
import { feedVariationWeight } from "./community-feed-variation";

export const isOriginalProfessionalPost = (post: PostResult) =>
  post.author.role === "psicologo" &&
  post.author.active &&
  !post.author.deleted &&
  post.author.psychologist_profile?.deleted === false &&
  isVerifiedProfessionalEntitlement(post.author.psychologist_profile);

export const isMixedFeedEligible = (post: PostResult) =>
  post.status === "publicado" &&
  (isOriginalProfessionalPost(post) ||
    (post.author.role === "paciente" && hasFeedVideoReply(post)));

export const originalPostMedia = (post: PostResult) => {
  const stored = post.media_items.filter((item) => item.media_url && item.media_type);
  return stored.length ? stored : [post];
};

// Assets supplied here were filtered for ready, community_post, active owner and not deleted.
export const hasAvailableOriginalVideo = (
  post: PostResult,
  assets: ReadonlyMap<string, ReadyFeedVideoAsset>,
) =>
  originalPostMedia(post).some((media) => {
    if (media.media_type !== "video") return false;
    const id = videoAssetIdFromReference(media.media_url);
    if (!id) return Boolean(publicFileKeyFromUrl(media.media_url, ["posts/media/"]));
    const asset = assets.get(id);
    return asset?.owner_id === post.author.id && asset.context_id === post.community.slug;
  });

export const originalProfessionalScore = (
  post: PostResult,
  metrics: CommunityPostSortMetricsDTO,
  video: boolean,
  now: number,
) => {
  const engagement = Math.max(
    0,
    3 * metrics.upvotes.all + metrics.comments.all + 2 * metrics.shares_count,
  );
  const penalty = Math.max(0, metrics.penalty) + 0.6 * Math.max(0, post.downvotes_count);
  return (
    Math.max(0, 1 + Math.log2(1 + engagement) - penalty) *
    featuredActivityDecay(post.createdAt, now) *
    (video ? 1.15 : 1)
  );
};

export const interleaveFeedGroups = <T>(patients: T[], professionals: T[]) => {
  const result: T[] = [];
  let patient = 0;
  let professional = 0;
  while (patient < patients.length || professional < professionals.length) {
    for (let slot = 0; slot < 4 && patient < patients.length; slot++)
      result.push(patients[patient++]);
    if (professional < professionals.length) result.push(professionals[professional++]);
  }
  return result;
};

export const sortMixedFeedPosts = (
  items: PostResult[],
  metrics: Map<string, CommunityPostSortMetricsDTO>,
  videoPostIds: ReadonlySet<string>,
  now = Date.now(),
  seed = 0,
) => {
  const eligible = [
    ...new Map(items.filter(isMixedFeedEligible).map((post) => [post.id, post])).values(),
  ];
  const patients = sortGeneralFeedPostResults(
    eligible.filter((post) => post.author.role === "paciente"),
    metrics,
    now,
    (id) => feedVariationWeight(id, seed),
  );
  const professionals = eligible
    .filter(isOriginalProfessionalPost)
    .map((post) => ({
      post,
      score:
        originalProfessionalScore(
          post,
          communityPostMetrics(post.id, metrics),
          videoPostIds.has(post.id),
          now,
        ) * feedVariationWeight(post.id, seed),
    }))
    .sort((a, b) => b.score - a.score || compareCommunityPostDates(a.post, b.post))
    .map(({ post }) => post);
  return interleaveFeedGroups(patients, professionals);
};
