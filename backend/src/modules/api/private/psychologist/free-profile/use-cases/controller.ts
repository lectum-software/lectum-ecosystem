import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { show as showService, update as updateService } from "./services";

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showService(req as unknown as Parameters<typeof showService>[0]);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_free_profile_show", err);
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const resolve = await updateService(req as unknown as Parameters<typeof updateService>[0]);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_free_profile_update", err);
  }
};
