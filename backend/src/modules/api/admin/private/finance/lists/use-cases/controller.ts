import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  listAdminFinanceCharges,
  listAdminFinanceSubscriptions,
} from "../../dashboard/use-cases/services";
import type { IAdminFinanceListsDTO } from "../DTOs/IAdminFinanceListsDTO";

export const charges = async (req: Request, res: Response) => {
  try {
    const request = req as IAdminFinanceListsDTO;
    const resolve = await listAdminFinanceCharges(request.q ?? {});
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_finance_charges", err);
  }
};

export const subscriptions = async (req: Request, res: Response) => {
  try {
    const request = req as IAdminFinanceListsDTO;
    const resolve = await listAdminFinanceSubscriptions(request.q ?? {});
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_finance_subscriptions", err);
  }
};
