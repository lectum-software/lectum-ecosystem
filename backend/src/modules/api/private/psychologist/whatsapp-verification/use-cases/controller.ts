import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  confirmVerification as confirmVerificationService,
  requestVerification as requestVerificationService,
} from "./services";

export const requestVerification = async (req: Request, res: Response) => {
  try {
    const resolve = await requestVerificationService(
      req as unknown as Parameters<typeof requestVerificationService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_whatsapp_verification_request", err);
  }
};

export const confirmVerification = async (req: Request, res: Response) => {
  try {
    const resolve = await confirmVerificationService(
      req as unknown as Parameters<typeof confirmVerificationService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_whatsapp_verification_confirm", err);
  }
};
