//Services

//Types
import type { Request, Response } from "express";

//Libs
import { error500, send } from "@/helpers/return";
import service from "./services";

export const need_reset = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "_full_auth_api_need_reset", err);
  }
};
