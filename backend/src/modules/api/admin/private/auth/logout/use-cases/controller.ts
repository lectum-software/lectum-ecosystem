import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { clearAdminAuthCookie } from "@/modules/api/admin/shared/auth/cookie";
import service from "./services";

export const logout = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req);
    clearAdminAuthCookie(res);
    return send(res, resolve);
  } catch (err) {
    clearAdminAuthCookie(res);
    return error500(res, "admin_auth_logout", err);
  }
};
