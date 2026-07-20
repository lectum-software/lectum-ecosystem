import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { updateAdminPatientPersonalData } from "./services";

export const updatePersonalData = async (req: Request, res: Response) => {
  try {
    const resolve = await updateAdminPatientPersonalData(
      req as unknown as Parameters<typeof updateAdminPatientPersonalData>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_profile_personal_update", err);
  }
};
