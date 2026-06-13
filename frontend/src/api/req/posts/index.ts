import { callEndpoint } from "@/api/generator";
import type {
  CreatePostReplyPayload,
  PostDetailResponse,
  PostRepliesQuery,
  PostRepliesResponse,
  PostReply,
  PostSaveResponse,
  PostVotePayload,
  PostVoteResponse,
  UserPostsQuery,
  UserPostsResponse,
} from "@/api/generator/types/posts";
import { handleReq } from "@/api/handle";

export const getMyPosts = async (query: UserPostsQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/posts/mine",
    query,
  });

  return handleReq<UserPostsResponse>(handle);
};

export const getSavedPosts = async (query: UserPostsQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/posts/saved",
    query,
  });

  return handleReq<UserPostsResponse>(handle);
};

export const getPostDetail = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id",
    params: { id },
  });

  return handleReq<PostDetailResponse>(handle);
};

export const getPostReplies = async (id: string, query: PostRepliesQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies",
    params: { id },
    query,
  });

  return handleReq<PostRepliesResponse>(handle);
};

export const createPostReply = async (id: string, body: CreatePostReplyPayload) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies",
    method: "POST",
    params: { id },
    body,
  });

  return handleReq<PostReply>({
    ...handle,
    showSuccess: true,
  });
};

export const votePost = async (id: string, body: PostVotePayload) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/vote",
    method: "POST",
    params: { id },
    body,
  });

  return handleReq<PostVoteResponse>({
    ...handle,
    hideError: true,
  });
};

export const savePost = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/save",
    method: "POST",
    params: { id },
  });

  return handleReq<PostSaveResponse>({
    ...handle,
    hideError: true,
  });
};

export const unsavePost = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/save",
    method: "DELETE",
    params: { id },
  });

  return handleReq<PostSaveResponse>({
    ...handle,
    hideError: true,
  });
};
