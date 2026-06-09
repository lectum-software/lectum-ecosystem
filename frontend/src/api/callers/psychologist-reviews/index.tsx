"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  PsychologistReviewsQuery,
  RespondPsychologistReviewPayload,
  RespondPsychologistReviewResponse,
} from "@/api/generator/types/psychologist-reviews";
import * as api from "@/api/req/psychologist-reviews";

export const usePsychologistReviews = (query: PsychologistReviewsQuery = {}) =>
  useQuery({
    queryKey: keys.psychologistReviews.list(query),
    queryFn: () => api.getPsychologistReviews(query),
    refetchOnWindowFocus: false,
    retry: false,
  });

export const useRespondPsychologistReview = (callbacks?: {
  onSuccess?: (data: RespondPsychologistReviewResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RespondPsychologistReviewPayload }) =>
      api.respondPsychologistReview(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistReviews.root() });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      queryClient.invalidateQueries({
        queryKey: keys.directory.psychologistRoot(data.psychologist_id),
      });
      callbacks?.onSuccess?.(data);
    },
    onError: callbacks?.onError,
  });
};
