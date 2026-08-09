import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { applyAdminAuthCookie } from "@/modules/api/admin/shared/auth/cookie";
import service from "./services";

export const hidrate = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req);
    return send(res, applyAdminAuthCookie(req, res, resolve));
  } catch (err) {
    return error500(res, "admin_auth_hidrate", err);
  }
};
