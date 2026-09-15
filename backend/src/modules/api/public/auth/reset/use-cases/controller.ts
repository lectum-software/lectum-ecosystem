//Services

//Types
import type { Request, Response } from "express";

//Libs
import { error500, send } from "@/helpers/return";
import service from "./services";

export const reset = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "_full_auth_api_reset", err);
  }
};
