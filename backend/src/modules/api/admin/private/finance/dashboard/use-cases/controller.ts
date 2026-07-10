import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import type { AdminFinanceQuery } from "../DTOs/IAdminFinanceDashboardDTO";
import service, { exportAdminFinanceDashboardCsv } from "./services";

type ExportData = {
  csv: string;
  filename: string;
  mime: string;
};

const isExportData = (value: unknown): value is ExportData =>
  Boolean(
    value && typeof value === "object" && "csv" in value && "filename" in value && "mime" in value,
  );

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
    if (!resolve.success || !isExportData(resolve.data)) return send(res, resolve);

    res.setHeader("Content-Type", resolve.data.mime);
    res.setHeader("Content-Disposition", `attachment; filename="${resolve.data.filename}"`);

    return res.status(200).send(`\uFEFF${resolve.data.csv}`);
  } catch (err) {
    return error500(res, "admin_finance_dashboard_export", err);
  }
};
