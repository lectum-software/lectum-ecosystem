import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { show as showService } from "./services";

export const show = async (_req: Request, res: Response) => {
  try {
    return send(res, await showService());
  } catch (err) {
    return error500(res, "admin_settings_subscription_plan_show", err);
  }
};
