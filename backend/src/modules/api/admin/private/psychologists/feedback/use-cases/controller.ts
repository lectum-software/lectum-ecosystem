import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { showAdminPsychologistReports, showAdminPsychologistReviews } from "./services";

export const reviews = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPsychologistReviews(
      req as unknown as Parameters<typeof showAdminPsychologistReviews>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_reviews_show", err);
  }
};

export const reports = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPsychologistReports(
      req as unknown as Parameters<typeof showAdminPsychologistReports>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_reports_show", err);
  }
};
