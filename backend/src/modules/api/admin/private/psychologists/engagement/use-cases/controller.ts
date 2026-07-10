import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { showAdminPsychologistPublications, showAdminPsychologistStatistics } from "./services";

export const statistics = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPsychologistStatistics(
      req as unknown as Parameters<typeof showAdminPsychologistStatistics>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_statistics_show", err);
  }
};

export const publications = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPsychologistPublications(
      req as unknown as Parameters<typeof showAdminPsychologistPublications>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_publications_show", err);
  }
};
