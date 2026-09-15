import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import * as service from "./services";

export const store = async (req: Request, res: Response) => {
  try {
    const resolve = await service.store(req);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "content-attention-tracking", err);
  }
};
