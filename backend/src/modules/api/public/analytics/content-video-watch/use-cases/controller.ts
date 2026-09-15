import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { store as storeService } from "./services";

export const store = async (req: Request, res: Response) => {
  try {
    const resolve = await storeService(req);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "content-video-watch-tracking", err);
  }
};
