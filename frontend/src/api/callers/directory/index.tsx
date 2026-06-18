"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  DirectoryPsychologistContactClickResponse,
  DirectoryPsychologistContactPayload,
  DirectoryPsychologistContactResponse,
  DirectoryPsychologistProfileListQuery,
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
