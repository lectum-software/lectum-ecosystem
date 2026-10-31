import { getApiErrorHttpStatus } from "@/api/errors";
import type { Community, CommunityPost } from "@/api/generator/types/community";
import { getCommunities, getCommunityPosts } from "@/api/req/community";

const mayHaveVideo = (post: CommunityPost) =>
  post.media_type === "video" ||
  post.media_items?.some((media) => media.media_type === "video") ||
  post.has_psychologist_reply;

const validatePage = (result: { page: number; pages: number }, expected: number) => {
  if (result.page !== expected || !Number.isInteger(result.pages) || result.pages < 0)
    throw new Error("Invalid community continuation");
};

// Discovery uses the existing access-filtered catalog. The video endpoint remains
// authoritative for visibility, author eligibility and playable media.
export const createContentVideoCommunityContinuation = (excludedSlug?: string) => {
  let catalogPage = 1;
  let catalogDone = false;
  let communities: Community[] = [];
  let community: Community | undefined;
  let postPage = 1;
  let postsDone = false;
  let posts: CommunityPost[] = [];
  const seenCommunities = new Set<string>();

  return {
    async next(signal: AbortSignal, visited: Set<string>) {
      if (signal.aborted) return { entry: null, ended: false };
      posts = posts.filter((post) => !visited.has(`${post.id}:discussion`));
      const post = posts.shift();
      if (post) return { entry: { postId: post.id }, ended: false };

      if (community && postsDone) community = undefined;
      if (!community) {
        community = communities.shift();
        postPage = 1;
        postsDone = false;
      }
      if (!community) {
        if (catalogDone) return { entry: null, ended: true };
        const result = await getCommunities({ page: catalogPage, limit: 20, scope: "all" });
        if (signal.aborted) return { entry: null, ended: false };
        validatePage(result, catalogPage);
        communities = result.data.filter((item) => {
          if (item.slug === excludedSlug || seenCommunities.has(item.id)) return false;
          seenCommunities.add(item.id);
          return true;
        });
        catalogDone = catalogPage >= result.pages;
        catalogPage += 1;
        return { entry: null, ended: false };
      }

      try {
        const result = await getCommunityPosts(community.slug, {
          page: postPage,
          limit: 20,
          sort: "new",
          period: "all",
        });
        if (signal.aborted) return { entry: null, ended: false };
        validatePage(result, postPage);
        posts = result.data.filter(mayHaveVideo);
        postsDone = postPage >= result.pages;
        postPage += 1;
      } catch (error) {
        if (![403, 404].includes(getApiErrorHttpStatus(error) ?? 0)) throw error;
        // A community can be removed or become inaccessible after listing it.
        postsDone = true;
      }
      return { entry: null, ended: false };
    },
  };
};
