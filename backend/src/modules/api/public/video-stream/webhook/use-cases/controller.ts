import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { store as storeService } from "./services";

export const store = async (req: Request, res: Response) => {
  try {
    return send(
      res,
      await storeService({
        body: req.rawBody ?? Buffer.alloc(0),
        signature: req.headers["webhook-signature"],
      }),
    );
  } catch (err) {
    return error500(res, "video_stream_webhook_store", err);
  }
};
