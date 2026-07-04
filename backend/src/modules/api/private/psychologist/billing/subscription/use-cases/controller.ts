import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import service, { cancelSubscription } from "./services";

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req as unknown as Parameters<typeof service>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_billing_subscription_show", err);
  }
};

export const cancel = async (req: Request, res: Response) => {
  try {
    const resolve = await cancelSubscription(req as unknown as Parameters<typeof service>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_billing_subscription_cancel", err);
  }
};
