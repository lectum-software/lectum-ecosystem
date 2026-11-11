import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFinanceKeys } from "@/api/cache/keys";
import {
  correctAdminExpense,
  createAdminExpense,
  type ExpenseQuery,
  getAdminExpenses,
  voidAdminExpense,
} from "@/api/req/finance/expenses";

export const useAdminExpenses = (query: ExpenseQuery, enabled: boolean) =>
  useQuery({
    queryKey: adminFinanceKeys.expenses(query),
    queryFn: () => getAdminExpenses(query),
    enabled,
  });
export const useAdminExpenseActions = () => {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: adminFinanceKeys.all });
  const create = useMutation({ mutationFn: createAdminExpense, retry: false, onSettled: refresh });
  const correct = useMutation({
    mutationFn: correctAdminExpense,
    retry: false,
    onSettled: refresh,
  });
  const cancel = useMutation({ mutationFn: voidAdminExpense, retry: false, onSettled: refresh });
  return {
    create,
    correct,
    cancel,
    busy: create.isPending || correct.isPending || cancel.isPending,
  };
};
