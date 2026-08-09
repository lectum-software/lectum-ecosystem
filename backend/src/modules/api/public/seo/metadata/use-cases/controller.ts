import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { index as indexService } from "./services";

export const index = async (_req: Request, res: Response) => {
  try {
    return send(res, await indexService());
  } catch (err) {
    return error500(res, "public_seo_metadata_index", err);
  }
};
