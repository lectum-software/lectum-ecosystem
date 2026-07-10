import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { showAdminPatient } from "./services";

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPatient(
      req as unknown as Parameters<typeof showAdminPatient>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_show", err);
  }
};
