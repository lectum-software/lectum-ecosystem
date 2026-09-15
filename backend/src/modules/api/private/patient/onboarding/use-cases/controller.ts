import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import service from "./services";

export const update = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req as unknown as Parameters<typeof service>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "patient_onboarding_update", err);
  }
};
