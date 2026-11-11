import { useQuery } from "@tanstack/react-query";
import { adminFinanceKeys } from "@/api/cache/keys";
import { type FinancialHistoryQuery, getAdminFinancialHistory } from "@/api/req/finance/history";

export const useAdminFinancialHistory = (input: FinancialHistoryQuery) =>
  useQuery({
    queryKey: adminFinanceKeys.history(input),
    queryFn: ({ signal }) => getAdminFinancialHistory(input, signal),
    placeholderData: undefined,
    retry: false,
  });
