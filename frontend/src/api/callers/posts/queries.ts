import { useInfiniteQuery, useQueries, useQuery, type useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { PostRepliesQuery, UserPostsQuery } from "@/api/generator/types/posts";
import * as api from "@/api/req/posts";

export const invalidateDirectoryPsychologistQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === "directory_psychologist",
  });
};

export const usePostDetail = (id: string, enabled = true) => {
  return useQuery({
    queryKey: keys.posts.detail(id),
    queryFn: () => api.getPostDetail(id),
    enabled: Boolean(id) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useMyPosts = (query: UserPostsQuery = {}, enabled = true) => {
  return useQuery({
    queryKey: keys.posts.mine(query),
    queryFn: () => api.getMyPosts(query),
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useInfiniteMyPosts = (query: UserPostsQuery = {}, enabled = true) => {
  return useInfiniteQuery({
    queryKey: keys.posts.mine({ ...query, mode: "infinite" }),
    queryFn: ({ pageParam }) => api.getMyPosts({ ...query, page: pageParam as number }),
    initialPageParam: query.page ?? 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useSavedPosts = (query: UserPostsQuery = {}, enabled = true) => {
  return useQuery({
    queryKey: keys.posts.saved(query),
    queryFn: () => api.getSavedPosts(query),
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const usePostReplies = (id: string, query: PostRepliesQuery = {}, enabled = true) => {
  return useQuery({
    queryKey: keys.posts.replies(id, query),
    queryFn: () => api.getPostReplies(id, query),
    enabled: Boolean(id) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const usePostRepliesPages = (
  id: string,
  queries: PostRepliesQuery[] = [],
  enabled = true,
) => {
  return useQueries({
    queries: queries.map((query) => ({
      queryKey: keys.posts.replies(id, query),
      queryFn: () => api.getPostReplies(id, query),
      enabled: Boolean(id) && enabled,
      refetchOnWindowFocus: false,
      retry: false,
    })),
  });
};

export const usePostReplyThread = (id: string, replyId: string, enabled = true) => {
  return useQuery({
    queryKey: ["posts", id, "reply-thread", replyId],
    queryFn: () => api.getPostReplyThread(id, replyId),
    enabled: Boolean(id) && Boolean(replyId) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};
