"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";

export const useTestimonialMutation = <T, R extends { psychologist_id: string }>(
  mutationFn: (variables: T) => Promise<R>,
  onSuccess?: (result: R) => void,
) => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (result) => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: keys.patient.reviewsRoot() }),
        cache.invalidateQueries({
          queryKey: keys.patient.reviewEligibility(result.psychologist_id),
        }),
        cache.invalidateQueries({
          queryKey: keys.directory.psychologistRoot(result.psychologist_id),
        }),
        cache.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() }),
        cache.invalidateQueries({ queryKey: keys.psychologistReviews.root() }),
        cache.invalidateQueries({ queryKey: ["testimonial-pending"] }),
      ]);
      onSuccess?.(result);
    },
  });
};
