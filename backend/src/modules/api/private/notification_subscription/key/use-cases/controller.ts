//Services

//Types
import type { Request, Response } from "express";

//Libs
import { error500, send } from "@/helpers/return";
import service from "./services";

export const key = async (_req: Request, res: Response) => {
  try {
    const resolve = await service();

    return send(res, resolve);
  } catch (err) {
    return error500(res, 169, err);
  }
};
