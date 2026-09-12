"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import { getApiErrorStatus } from "@/api/errors";
import * as api from "@/api/req/legal";

export const LEGAL_POLL_INTERVAL = 5 * 60 * 1_000;

export const useCurrentLegal = () =>
  useQuery({
    queryKey: keys.legal.current(),
    queryFn: api.currentLegal,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: LEGAL_POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });

export const useLegalStatus = (userId: string, enabled = true) =>
  useQuery({
    queryKey: keys.legal.status(userId),
    queryFn: api.legalStatus,
    enabled: Boolean(userId) && enabled,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: LEGAL_POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });

export const usePublishedLegalDocument = (id: string) =>
  useQuery({
    queryKey: keys.legal.document(id),
    queryFn: () => api.publishedLegalDocument(id),
    enabled: Boolean(id),
    retry: false,
  });

export const useAcceptLegal = (userId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.acceptLegal,
    retry: false,
    onSuccess: async (status) => {
      await queryClient.cancelQueries({ queryKey: keys.legal.status(userId) });
      queryClient.setQueryData(keys.legal.status(userId), status);
      await queryClient.invalidateQueries({ queryKey: keys.legal.root() });
    },
    onError: async (error) => {
      if (getApiErrorStatus(error) === 409) {
        await queryClient.invalidateQueries({ queryKey: keys.legal.root() });
      }
    },
  });
};
