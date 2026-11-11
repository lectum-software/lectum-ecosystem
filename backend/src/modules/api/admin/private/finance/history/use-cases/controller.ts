import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import type { IAdminFinanceHistoryDTO } from "../DTOs/IAdminFinanceHistoryDTO";
import { showAdminFinanceHistory } from "./services";

export async function index(req: Request, res: Response) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    return send(res, await showAdminFinanceHistory((req as IAdminFinanceHistoryDTO).q ?? {}));
  } catch (cause) {
    return error500(res, "admin_finance_history", cause);
  }
}
