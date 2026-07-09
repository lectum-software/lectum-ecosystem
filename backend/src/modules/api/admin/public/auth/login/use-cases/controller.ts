import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import service from "./services";

export const login = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_auth_login", err);
  }
};
