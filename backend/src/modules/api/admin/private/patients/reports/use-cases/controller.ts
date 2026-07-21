import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { showAdminPatientReports } from "./services";

export const reports = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPatientReports(
      req as unknown as Parameters<typeof showAdminPatientReports>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_reports_show", err);
  }
};
