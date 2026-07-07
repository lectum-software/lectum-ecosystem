import { callEndpoint } from "@/api/generator";
import type {
  DirectoryPsychologistContactClickResponse,
  DirectoryPsychologistContactPayload,
  DirectoryPsychologistContactResponse,
  DirectoryPsychologistProfile,
  DirectoryPsychologistProfileListQuery,
  DirectoryPsychologistProfilePostsResponse,
  DirectoryPsychologistProfileReviewsResponse,
  DirectoryPsychologistProfileViewResponse,
  DirectoryPsychologistsQuery,
  DirectoryPsychologistsResponse,
  DirectoryPsychologistVideoWatchPayload,
  DirectoryPsychologistVideoWatchResponse,
} from "@/api/generator/types/directory";
import { handleReq } from "@/api/handle";

export const getDirectoryPsychologists = async (query: DirectoryPsychologistsQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/directory/psychologists",
    query,
  });

  return handleReq<DirectoryPsychologistsResponse>(handle);
};

export const getDirectoryPsychologist = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/directory/psychologists/:id",
    params: { id },
  });

  return handleReq<DirectoryPsychologistProfile>(handle);
};

export const getDirectoryPsychologistPosts = async (
  id: string,
  query: DirectoryPsychologistProfileListQuery = {},
) => {
  const handle = callEndpoint({
    route: "/api/private/directory/psychologists/:id/posts",
    params: { id },
    query,
  });

  return handleReq<DirectoryPsychologistProfilePostsResponse>(handle);
};

export const getDirectoryPsychologistReviews = async (
  id: string,
  query: DirectoryPsychologistProfileListQuery = {},
) => {
  const handle = callEndpoint({
    route: "/api/private/directory/psychologists/:id/reviews",
    params: { id },
    query,
  });

  return handleReq<DirectoryPsychologistProfileReviewsResponse>(handle);
};

export const createDirectoryPsychologistContact = async (
  id: string,
  body: DirectoryPsychologistContactPayload,
) => {
  const handle = callEndpoint({
    route: "/api/private/directory/psychologists/:id/contact",
    method: "POST",
    params: { id },
    body,
  });

  return handleReq<DirectoryPsychologistContactResponse>({
    ...handle,
    signOutOnUnauthorized: false,
    showSuccess: true,
  });
};

export const createDirectoryPsychologistContactClick = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/directory/psychologists/:id/contact-click",
    method: "POST",
    params: { id },
  });

  return handleReq<DirectoryPsychologistContactClickResponse>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

export const trackDirectoryPsychologistProfileView = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/directory/psychologists/:id/view",
    method: "POST",
    params: { id },
  });

  return handleReq<DirectoryPsychologistProfileViewResponse>({
    ...handle,
    hideError: true,
  });
};

export const trackDirectoryPsychologistVideoWatch = async (
  id: string,
  body: DirectoryPsychologistVideoWatchPayload,
) => {
  const handle = callEndpoint({
    route: "/api/private/directory/psychologists/:id/video-watch",
    method: "POST",
    params: { id },
    body,
  });

  return handleReq<DirectoryPsychologistVideoWatchResponse>({
    ...handle,
    hideError: true,
  });
};
