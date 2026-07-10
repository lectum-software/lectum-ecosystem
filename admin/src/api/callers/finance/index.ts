import { useMutation, useQuery } from "@tanstack/react-query";
import { adminFinanceKeys } from "@/api/cache/keys";
import {
  exportAdminFinanceDashboard,
  type FinanceDashboardQuery,
  getAdminFinanceDashboard,
} from "@/api/req/finance";

export const useAdminFinanceDashboard = (
  input: FinanceDashboardQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminFinanceDashboard(input),
    queryKey: adminFinanceKeys.dashboard(input),
  });

export const useAdminFinanceExport = () =>
  useMutation({
    mutationFn: exportAdminFinanceDashboard,
  });
