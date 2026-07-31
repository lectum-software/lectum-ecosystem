"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  DirectoryPsychologistContactClickResponse,
  DirectoryPsychologistContactPayload,
  DirectoryPsychologistContactResponse,
  DirectoryPsychologistProfileListQuery,
  DirectoryPsychologistProfileViewResponse,
  DirectoryPsychologistSearchImpressionPayload,
  DirectoryPsychologistsQuery,
  DirectoryPsychologistVideoWatchPayload,
  DirectoryPsychologistVideoWatchResponse,
} from "@/api/generator/types/directory";
import * as api from "@/api/req/directory";

export const useDirectoryPsychologists = (
  query: DirectoryPsychologistsQuery = {},
  enabled = true,
) => {
  return useQuery({
    queryKey: keys.directory.psychologists(query),
    queryFn: () => api.getDirectoryPsychologists(query),
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useDirectoryPsychologist = (id: string) => {
  return useQuery({
    queryKey: keys.directory.psychologist(id),
    queryFn: () => api.getDirectoryPsychologist(id),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useDirectoryPsychologistPosts = (
  id: string,
  query: DirectoryPsychologistProfileListQuery = {},
  enabled = true,
) => {
  return useQuery({
    queryKey: keys.directory.psychologistPosts(id, query),
    queryFn: () => api.getDirectoryPsychologistPosts(id, query),
    enabled: Boolean(id) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useInfiniteDirectoryPsychologistPosts = (
  id: string,
  query: DirectoryPsychologistProfileListQuery = {},
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: keys.directory.psychologistPosts(id, { ...query, mode: "infinite" }),
    queryFn: ({ pageParam }) =>
      api.getDirectoryPsychologistPosts(id, { ...query, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    enabled: Boolean(id) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useDirectoryPsychologistReviews = (
  id: string,
  query: DirectoryPsychologistProfileListQuery = {},
  enabled = true,
) => {
  return useQuery({
    queryKey: keys.directory.psychologistReviews(id, query),
    queryFn: () => api.getDirectoryPsychologistReviews(id, query),
    enabled: Boolean(id) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useInfiniteDirectoryPsychologistReviews = (
  id: string,
  query: DirectoryPsychologistProfileListQuery = {},
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: keys.directory.psychologistReviews(id, { ...query, mode: "infinite" }),
    queryFn: ({ pageParam }) =>
      api.getDirectoryPsychologistReviews(id, { ...query, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    enabled: Boolean(id) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useDirectoryPsychologistContact = (
  id: string,
  callbacks?: {
    onSuccess?: (data: DirectoryPsychologistContactResponse) => void;
    onError?: (error: unknown) => void;
  },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: DirectoryPsychologistContactPayload) =>
      api.createDirectoryPsychologistContact(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.patient.profile() });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologist(id) });
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useDirectoryPsychologistContactClick = (
  id: string,
  callbacks?: {
    onSuccess?: (data: DirectoryPsychologistContactClickResponse) => void;
    onError?: (error: unknown) => void;
  },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.createDirectoryPsychologistContactClick(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.patient.profile() });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologist(id) });
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};

export const useDirectoryPsychologistProfileView = (
  id: string,
  callbacks?: {
    onError?: (error: unknown) => void;
    onSuccess?: (data: DirectoryPsychologistProfileViewResponse) => void;
  },
) =>
  useMutation({
    mutationFn: () => api.trackDirectoryPsychologistProfileView(id),
    onError: callbacks?.onError,
    onSuccess: callbacks?.onSuccess,
  });

export const useDirectoryPsychologistSearchImpression = (callbacks?: {
  onError?: (error: unknown) => void;
  onSuccess?: (data: DirectoryPsychologistProfileViewResponse) => void;
}) =>
  useMutation({
    mutationFn: ({
      id,
      position,
    }: {
      id: string;
      position?: DirectoryPsychologistSearchImpressionPayload["position"];
    }) => api.trackDirectoryPsychologistSearchImpression(id, { position }),
    onError: callbacks?.onError,
    onSuccess: callbacks?.onSuccess,
  });

export const useDirectoryPsychologistVideoWatch = (
  id: string,
  callbacks?: {
    onError?: (error: unknown) => void;
    onSuccess?: (data: DirectoryPsychologistVideoWatchResponse) => void;
  },
) =>
  useMutation({
    mutationFn: (body: DirectoryPsychologistVideoWatchPayload) =>
      api.trackDirectoryPsychologistVideoWatch(id, body),
    onError: callbacks?.onError,
    onSuccess: callbacks?.onSuccess,
  });
