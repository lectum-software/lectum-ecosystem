import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  resolveAdminPsychologistReport,
  showAdminPsychologistReports,
  showAdminPsychologistReviews,
  startAdminPsychologistReportReview,
} from "./services";

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

export const startReportReview = async (req: Request, res: Response) => {
  try {
    const resolve = await startAdminPsychologistReportReview(
      req as unknown as Parameters<typeof startAdminPsychologistReportReview>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_report_review_start", err);
  }
};

export const resolveReport = async (req: Request, res: Response) => {
  try {
    const resolve = await resolveAdminPsychologistReport(
      req as unknown as Parameters<typeof resolveAdminPsychologistReport>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_report_resolve", err);
  }
};
