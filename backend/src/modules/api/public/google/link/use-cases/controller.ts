import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { createIntent as createIntentService, unlink as unlinkService } from "./services";

export const createIntent = async (req: Request, res: Response) => {
  try {
    const resolve = await createIntentService(
      req as unknown as Parameters<typeof createIntentService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "google_link_intent", err);
  }
};

export const unlink = async (req: Request, res: Response) => {
  try {
    const resolve = await unlinkService(req as unknown as Parameters<typeof unlinkService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "google_unlink", err);
  }
};
