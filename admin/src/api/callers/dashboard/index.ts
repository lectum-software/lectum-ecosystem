import { useMutation, useQuery } from "@tanstack/react-query";
import { adminDashboardKeys } from "@/api/cache/keys";
import {
  type DashboardSummaryQuery,
  exportAdminDashboardSummary,
  getAdminDashboardSummary,
} from "@/api/req/dashboard";

export const useAdminDashboardSummary = (
  input: DashboardSummaryQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminDashboardSummary(input),
    queryKey: adminDashboardKeys.summary(input),
  });

export const useAdminDashboardExport = () =>
  useMutation({
    mutationFn: exportAdminDashboardSummary,
  });
