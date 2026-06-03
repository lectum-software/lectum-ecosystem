import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import service from "./services";

export const test = async (_req: Request, res: Response) => {
  try {
    const resolve = await service();

    return send(res, resolve);
  } catch (err) {
    return error500(res, "notification_test_trigger", err);
  }
};
