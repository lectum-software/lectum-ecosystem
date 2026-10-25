import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type FeedbackFilters,
  type FeedbackUpdate,
  getFeedback,
  getFeedbackCount,
  getFeedbacks,
  updateFeedback,
} from "@/api/req/feedback";
export const feedbackKeys = { all: ["admin-feedback"] as const };
export const useFeedbackCount = () =>
  useQuery({
    queryKey: [...feedbackKeys.all, "count"],
    queryFn: getFeedbackCount,
    refetchInterval: 60_000,
  });
export const useFeedbacks = (filters: FeedbackFilters) =>
  useQuery({
    queryKey: [...feedbackKeys.all, "list", filters],
    queryFn: () => getFeedbacks(filters),
  });
export const useFeedback = (id: string) =>
  useQuery({ queryKey: [...feedbackKeys.all, "detail", id], queryFn: () => getFeedback(id) });
export const useUpdateFeedback = (id: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: FeedbackUpdate) => updateFeedback(id, body),
    onSuccess: () => client.invalidateQueries({ queryKey: feedbackKeys.all }),
  });
};
