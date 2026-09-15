//Services

//Types
import type { Request, Response } from "express";

//Helpers
import { error500, send } from "@/helpers/return";
import service from "./services";

export const hidrate = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req);
    return send(res, resolve);
  } catch (err) {
    return error500(res, 10019, err);
  }
};
