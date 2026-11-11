import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { AdminFinanceHistoryQuery } from "../DTOs/IAdminFinanceHistoryDTO";
import {
  AdminFinanceHistoryRepository,
  HistoryFilterRequiredError,
  readHistoryContext,
} from "../repositories/AdminFinanceHistoryRepository";
import { projectAdminHistory } from "./projection";

export async function showAdminFinanceHistory(
  query: AdminFinanceHistoryQuery = {},
): Promise<Resolve> {
  if (query.from && query.to && query.from > query.to)
    return { status: 400, ...error("finance_history_invalid_period", {}) };
  const context = readHistoryContext();
  try {
    const records = await new AdminFinanceHistoryRepository().read(query, context);
    return { status: 200, ...msg("show", {}), data: projectAdminHistory(records, query, context) };
  } catch (cause) {
    if (cause instanceof HistoryFilterRequiredError)
      return { status: 503, ...error("finance_history_filter_required", {}) };
    throw cause;
  }
}
