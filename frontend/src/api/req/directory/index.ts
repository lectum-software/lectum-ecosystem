import { callEndpoint } from "@/api/generator";
import type {
  DirectoryPsychologistProfile,
  DirectoryPsychologistProfileListQuery,
  DirectoryPsychologistProfilePostsResponse,
  DirectoryPsychologistProfileReviewsResponse,
  DirectoryPsychologistsQuery,
  DirectoryPsychologistsResponse,
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
