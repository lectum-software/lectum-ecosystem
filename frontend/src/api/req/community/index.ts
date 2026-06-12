import { callEndpoint } from "@/api/generator";
import type {
  CommunityListQuery,
  CommunityListResponse,
  CommunityPostsQuery,
  CommunityPostsResponse,
  CommunitySuggestion,
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
