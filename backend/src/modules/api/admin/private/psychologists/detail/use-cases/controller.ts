import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { showAdminPsychologist } from "./services";

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPsychologist(
      req as unknown as Parameters<typeof showAdminPsychologist>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_show", err);
  }
};
