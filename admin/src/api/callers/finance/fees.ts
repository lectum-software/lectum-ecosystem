import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFinanceKeys } from "@/api/cache/keys";
import { type FeeQuery, getAdminStripeFees, observeAdminStripeFee } from "@/api/req/finance/fees";

export const useAdminStripeFees = (query: FeeQuery, enabled: boolean) =>
  useQuery({
    queryKey: adminFinanceKeys.stripeFees(query),
    queryFn: () => getAdminStripeFees(query),
    enabled,
  });
export const useObserveAdminStripeFee = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: observeAdminStripeFee,
    retry: false,
    onSettled: () => client.invalidateQueries({ queryKey: adminFinanceKeys.stripeFeesAll() }),
  });
};
