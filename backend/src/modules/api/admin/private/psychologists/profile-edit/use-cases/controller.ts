import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  updateAdminPsychologistPersonalData,
  updateAdminPsychologistProfessionalData,
} from "./services";

export const updatePersonalData = async (req: Request, res: Response) => {
  try {
    const resolve = await updateAdminPsychologistPersonalData(
      req as unknown as Parameters<typeof updateAdminPsychologistPersonalData>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_profile_personal_update", err);
  }
};

export const updateProfessionalData = async (req: Request, res: Response) => {
  try {
    const resolve = await updateAdminPsychologistProfessionalData(
      req as unknown as Parameters<typeof updateAdminPsychologistProfessionalData>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_profile_professional_update", err);
  }
};
