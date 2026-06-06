import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { action, index as indexService } from "./services";

export const index = async (req: Request, res: Response) => {
  try {
    const resolve = await indexService(req as unknown as Parameters<typeof indexService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "patient_follow_index", err);
  }
};

export const store = async (req: Request, res: Response) => {
  try {
    const resolve = await action(req as unknown as Parameters<typeof action>[0], "follow");

    return send(res, resolve);
  } catch (err) {
    return error500(res, "patient_follow_store", err);
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    const resolve = await action(req as unknown as Parameters<typeof action>[0], "unfollow");

    return send(res, resolve);
  } catch (err) {
    return error500(res, "patient_follow_destroy", err);
  }
};
