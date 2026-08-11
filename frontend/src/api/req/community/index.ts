import { callEndpoint } from "@/api/generator";
import type {
  CommunityDetailResponse,
  CommunityFeedQuery,
  CommunityFeedResponse,
  CommunityListQuery,
  CommunityListResponse,
  CommunityMembershipResponse,
  CommunityPost,
  CommunityPostMediaUploadResponse,
  CommunityPostsQuery,
  CommunityPostsResponse,
  CommunitySuggestion,
  CommunityTopMentorsQuery,
  CommunityTopMentorsResponse,
  CreateCommunityPostPayload,
  SuggestCommunityPayload,
} from "@/api/generator/types/community";
import { handleReq } from "@/api/handle";
import { COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS } from "@/utils/media-upload-error";

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

export const getCommunityTopMentors = async (query: CommunityTopMentorsQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/community/top-mentors",
    query,
  });

  return handleReq<CommunityTopMentorsResponse>(handle);
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

  return handleReq<CommunityMembershipResponse>(handle);
};

export const unfollowCommunity = async (slug: string) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/members",
    method: "DELETE",
    params: { slug },
  });

  return handleReq<CommunityMembershipResponse>(handle);
};

export const suggestCommunity = async (body: SuggestCommunityPayload) => {
  const handle = callEndpoint({
    route: "/api/private/community/suggestions",
    method: "POST",
    body,
  });

  return handleReq<CommunitySuggestion>({
    ...handle,
    hideError: true,
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

  return handleReq<CommunityPost>({ ...handle, hideError: true });
};

export const uploadCommunityPostMedia = async (slug: string, file: File) => {
  const body = new FormData();
  body.append("media", file);

  const handle = callEndpoint({
    route: "/api/private/community/:slug/posts/media",
    method: "POST",
    params: { slug },
    body,
    config: { timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
  });

  return handleReq<CommunityPostMediaUploadResponse>({
    ...handle,
    hideError: true,
  });
};
