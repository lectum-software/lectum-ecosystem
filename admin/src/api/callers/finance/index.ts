import { useMutation, useQuery } from "@tanstack/react-query";
import { adminFinanceKeys } from "@/api/cache/keys";
import {
  exportAdminFinanceDashboard,
  type FinanceDashboardQuery,
  type FinanceListQuery,
  getAdminFinanceCharges,
  getAdminFinanceDashboard,
  getAdminFinanceSubscriptions,
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

export const useAdminFinanceCharges = (
  input: FinanceListQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminFinanceCharges(input),
    queryKey: adminFinanceKeys.charges(input),
  });

export const useAdminFinanceSubscriptions = (
  input: FinanceListQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminFinanceSubscriptions(input),
    queryKey: adminFinanceKeys.subscriptions(input),
  });
