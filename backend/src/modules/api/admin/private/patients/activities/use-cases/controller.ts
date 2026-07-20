import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { showAdminPatientActivities } from "./services";

export const activities = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPatientActivities(
      req as unknown as Parameters<typeof showAdminPatientActivities>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_activities_show", err);
  }
};
