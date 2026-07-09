import { useMutation, useQuery } from "@tanstack/react-query";
import { adminTrafficKeys } from "@/api/cache/keys";
import {
  exportAdminTrafficSummary,
  getAdminTrafficSummary,
  type TrafficSummaryQuery,
} from "@/api/req/traffic";

export const useAdminTrafficSummary = (
  input: TrafficSummaryQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminTrafficSummary(input),
    queryKey: adminTrafficKeys.summary(input),
  });

export const useAdminTrafficExport = () =>
  useMutation({
    mutationFn: exportAdminTrafficSummary,
  });
