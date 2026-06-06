import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { confirm as confirmService, search as searchService } from "./services";

export const search = async (req: Request, res: Response) => {
  try {
    const resolve = await searchService(req as unknown as Parameters<typeof searchService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_cfp_search", err);
  }
};

export const confirm = async (req: Request, res: Response) => {
  try {
    const resolve = await confirmService(req as unknown as Parameters<typeof confirmService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_cfp_confirm", err);
  }
};
