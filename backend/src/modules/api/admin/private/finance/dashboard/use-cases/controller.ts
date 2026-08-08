import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { sendCsv } from "@/helpers/return/csv";
import type { AdminFinanceQuery } from "../DTOs/IAdminFinanceDashboardDTO";
import service, { exportAdminFinanceDashboardCsv } from "./services";

export const index = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req as Parameters<typeof service>[0]);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_finance_dashboard", err);
  }
};

export const exportCsv = async (req: Request, res: Response) => {
  try {
    const request = req as Request & { q?: AdminFinanceQuery };
    const resolve = await exportAdminFinanceDashboardCsv(request.q ?? {});
    return sendCsv(res, resolve);
  } catch (err) {
    return error500(res, "admin_finance_dashboard_export", err);
  }
};
