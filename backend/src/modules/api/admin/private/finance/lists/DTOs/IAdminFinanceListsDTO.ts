import type { Request } from "express";
import type { AdminFinanceQuery } from "../../dashboard/DTOs/IAdminFinanceDashboardDTO";

export type IAdminFinanceListsDTO = Request & {
  q: AdminFinanceQuery;
};
