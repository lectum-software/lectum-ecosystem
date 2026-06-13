import { callEndpoint } from "@/api/generator";
import type {
  CommunityDetailResponse,
  CommunityFeedQuery,
  CommunityFeedResponse,
  CommunityListQuery,
  CommunityListResponse,
  CommunityMembershipResponse,
  CommunityPost,
  CommunityPostsQuery,
  CommunityPostsResponse,
  CommunitySuggestion,
  CreateCommunityPostPayload,
  SuggestCommunityPayload,
} from "@/api/generator/types/community";
import { handleReq } from "@/api/handle";

export const getCommunities = async (query: CommunityListQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/community",
    query,
  });

  return handleReq<CommunityListResponse>(handle);
};

export const getCommunityFeedPosts = async (query: CommunityFeedQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/community/feed/posts",
    query,
  });

  return handleReq<CommunityFeedResponse>(handle);
};

export const getCommunityDetail = async (slug: string) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug",
    params: { slug },
  });

  return handleReq<CommunityDetailResponse>(handle);
};

export const followCommunity = async (slug: string) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/members",
    method: "POST",
    params: { slug },
  });

  return handleReq<CommunityMembershipResponse>({
    ...handle,
    showSuccess: true,
  });
};

export const unfollowCommunity = async (slug: string) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/members",
    method: "DELETE",
    params: { slug },
  });

  return handleReq<CommunityMembershipResponse>({
    ...handle,
    showSuccess: true,
  });
};

export const suggestCommunity = async (body: SuggestCommunityPayload) => {
  const handle = callEndpoint({
    route: "/api/private/community/suggestions",
    method: "POST",
    body,
  });

  return handleReq<CommunitySuggestion>({
    ...handle,
    showSuccess: true,
  });
};

export const getCommunityPosts = async (slug: string, query: CommunityPostsQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/posts",
    params: { slug },
    query,
  });

  return handleReq<CommunityPostsResponse>(handle);
};

export const createCommunityPost = async (slug: string, body: CreateCommunityPostPayload) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/posts",
    method: "POST",
    params: { slug },
    body,
  });

  return handleReq<CommunityPost>({
    ...handle,
    showSuccess: true,
  });
};
