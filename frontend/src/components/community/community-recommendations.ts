import type { Community } from "@/api/generator/types/community";

export const COMMUNITIES_PER_CAROUSEL = 6;

export const selectCommunityRecommendations = (
  communities: Community[],
  current?: Pick<Community, "slug" | "category">,
) => {
  const unique = new Map(communities.map((community) => [community.slug, community]));
  return [...unique.values()]
    .filter((community) => community.slug !== current?.slug && !community.following)
    .sort((left, right) => {
      const related = (community: Community) =>
        Number(Boolean(current?.category && community.category === current.category));
      return (
        related(right) - related(left) ||
        (right.posts_count ?? 0) - (left.posts_count ?? 0) ||
        right.members_count - left.members_count ||
        left.slug.localeCompare(right.slug)
      );
    });
};

export const isCommunityFeedExhausted = ({
  success,
  loading,
  error,
  hasNextPage,
  searching,
}: {
  success: boolean;
  loading: boolean;
  error: boolean;
  hasNextPage: boolean | undefined;
  searching: boolean;
}) => success && !loading && !error && hasNextPage === false && !searching;

export const communityCarouselOffset = (
  postIndex: number,
  postCount: number,
  exhausted: boolean,
) => {
  if (exhausted && postCount < 4 && postIndex === postCount - 1) return 0;
  return postIndex >= 3 && (postIndex - 3) % 12 === 0
    ? ((postIndex - 3) / 12) * COMMUNITIES_PER_CAROUSEL
    : null;
};

// Keep the chosen slots stable while membership and counts refresh after following.
export const refreshCommunityRecommendations = (slugs: string[], communities: Community[]) => {
  const bySlug = new Map(communities.map((community) => [community.slug, community]));
  return slugs.flatMap((slug) => {
    const community = bySlug.get(slug);
    return community ? [community] : [];
  });
};
