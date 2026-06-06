import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import service from "./services";

export const store = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req as unknown as Parameters<typeof service>[0], "favorite");

    return send(res, resolve);
  } catch (err) {
    return error500(res, "patient_favorite_store", err);
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req as unknown as Parameters<typeof service>[0], "unfavorite");

    return send(res, resolve);
  } catch (err) {
    return error500(res, "patient_favorite_destroy", err);
  }
};
