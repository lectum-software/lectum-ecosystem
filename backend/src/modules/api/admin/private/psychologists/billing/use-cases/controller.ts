import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  cancelSubscription,
  grantCourtesy,
  revokeCourtesy,
  showAdminPsychologistBilling,
} from "./services";

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPsychologistBilling(
      req as unknown as Parameters<typeof showAdminPsychologistBilling>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_billing_show", err);
  }
};

export const grant = async (req: Request, res: Response) => {
  try {
    const resolve = await grantCourtesy(req as unknown as Parameters<typeof grantCourtesy>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_billing_grant", err);
  }
};

export const revoke = async (req: Request, res: Response) => {
  try {
    const resolve = await revokeCourtesy(req as unknown as Parameters<typeof revokeCourtesy>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_billing_revoke", err);
  }
};

export const cancel = async (req: Request, res: Response) => {
  try {
    const resolve = await cancelSubscription(
      req as unknown as Parameters<typeof cancelSubscription>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_billing_cancel", err);
  }
};
