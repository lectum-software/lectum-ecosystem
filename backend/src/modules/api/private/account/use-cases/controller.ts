import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { security as securityService, updateEmail, updatePassword } from "./services";

export const security = async (req: Request, res: Response) => {
  try {
    const resolve = await securityService(req as unknown as Parameters<typeof securityService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "account_security", err);
  }
};

export const email = async (req: Request, res: Response) => {
  try {
    const resolve = await updateEmail(req as unknown as Parameters<typeof updateEmail>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "account_email_update", err);
  }
};

export const password = async (req: Request, res: Response) => {
  try {
    const resolve = await updatePassword(req as unknown as Parameters<typeof updatePassword>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "account_password_update", err);
  }
};
