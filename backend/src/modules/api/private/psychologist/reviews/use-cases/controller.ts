import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { index as indexService, respond as respondService } from "./services";

export const index = async (req: Request, res: Response) => {
  try {
    return send(res, await indexService(req as unknown as Parameters<typeof indexService>[0]));
  } catch (err) {
    return error500(res, "psychologist_review_index", err);
  }
};

export const respond = async (req: Request, res: Response) => {
  try {
    return send(res, await respondService(req as unknown as Parameters<typeof respondService>[0]));
  } catch (err) {
    return error500(res, "psychologist_review_respond", err);
  }
};
