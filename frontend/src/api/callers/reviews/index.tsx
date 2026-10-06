"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  CreatePatientReviewPayload,
  CreatePatientReviewResponse,
  PatientReviewsQuery,
} from "@/api/generator/types/reviews";
import * as api from "@/api/req/reviews";
import { nextListPage } from "@/utils/infinite-list";

export const useInfinitePatientReviews = (query: Omit<PatientReviewsQuery, "page"> = {}) =>
  useInfiniteQuery({
    queryKey: keys.patient.reviews({ ...query, mode: "infinite" }),
    queryFn: ({ pageParam }) => api.getPatientReviews({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextListPage,
    refetchOnWindowFocus: false,
    retry: false,
  });

export const usePatientReviews = (query: PatientReviewsQuery = {}) =>
  useQuery({
    queryKey: keys.patient.reviews(query),
    queryFn: () => api.getPatientReviews(query),
    refetchOnWindowFocus: false,
    retry: false,
  });

export const useDeletePatientReview = (onSuccess: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deletePatientReview,
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.patient.reviewsRoot() }),
        queryClient.invalidateQueries({
          queryKey: keys.patient.reviewEligibility(data.psychologist_id),
        }),
        queryClient.invalidateQueries({
          queryKey: keys.directory.psychologistRoot(data.psychologist_id),
        }),
        queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() }),
        queryClient.invalidateQueries({ queryKey: keys.psychologistReviews.root() }),
      ]);
      onSuccess();
    },
  });
};

export const useReviewEligibility = (id: string, enabled = true) =>
  useQuery({
    queryKey: keys.patient.reviewEligibility(id),
    queryFn: () => api.getReviewEligibility(id),
    enabled: Boolean(id) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });

export const useCreatePatientReview = (callbacks?: {
  onSuccess?: (data: CreatePatientReviewResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePatientReviewPayload) => api.createPatientReview(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.patient.reviewsRoot() });
      queryClient.invalidateQueries({
        queryKey: keys.patient.reviewEligibility(data.psychologist_id),
      });
      queryClient.invalidateQueries({
        queryKey: keys.directory.psychologistRoot(data.psychologist_id),
      });
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};
