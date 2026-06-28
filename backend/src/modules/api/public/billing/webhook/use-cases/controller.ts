import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import service from "./services";

export const store = async (req: Request, res: Response) => {
  try {
    const resolve = await service({
      body: req.body,
      headers: req.headers,
    });

    return send(res, resolve);
  } catch (err) {
    return error500(res, "public_billing_webhook_store", err);
  }
};
