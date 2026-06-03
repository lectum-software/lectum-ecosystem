//Services

//Types
import type { Request, Response } from "express";

//Libs
import { error500, send } from "@/helpers/return";
import service from "./services";

export const store = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "pzh71qvmnaam7x99jtk97n95", err);
  }
};
