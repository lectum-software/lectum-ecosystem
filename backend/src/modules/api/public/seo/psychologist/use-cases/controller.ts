import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { show as showService } from "./services";

export const show = async (req: Request, res: Response) => {
  try {
    return send(
      res,
      await showService({
        id: String(req.params.id ?? ""),
      }),
    );
  } catch (err) {
    return error500(res, "public_psychologist_seo_show", err);
  }
};
