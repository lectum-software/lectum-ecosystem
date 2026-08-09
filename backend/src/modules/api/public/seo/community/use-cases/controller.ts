import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { show as showService } from "./services";

export const show = async (req: Request, res: Response) => {
  try {
    return send(
      res,
      await showService({
        slug: String(req.params.slug ?? ""),
      }),
    );
  } catch (err) {
    return error500(res, "public_community_seo_show", err);
  }
};
