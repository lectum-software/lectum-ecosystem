import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import * as service from "./services";

export const create = async (req: Request, res: Response) => {
  try {
    const resolve = await service.create(req);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "page-view-tracking", err);
  }
};

export const updateDuration = async (req: Request, res: Response) => {
  try {
    const resolve = await service.updateDuration(req);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "page-view-duration", err);
  }
};
