import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { showAdminPsychologistActivities } from "./services";

export const activities = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPsychologistActivities(
      req as unknown as Parameters<typeof showAdminPsychologistActivities>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_activities_show", err);
  }
};
