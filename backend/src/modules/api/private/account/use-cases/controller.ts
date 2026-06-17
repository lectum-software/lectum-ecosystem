import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  createDeleteGoogleIntent,
  destroy as destroyService,
  onboardingTips as onboardingTipsService,
  security as securityService,
  updateEmail,
  updateOnboardingTips,
  updatePassword,
} from "./services";

export const security = async (req: Request, res: Response) => {
  try {
    const resolve = await securityService(req as unknown as Parameters<typeof securityService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "account_security", err);
  }
};

export const email = async (req: Request, res: Response) => {
  try {
    const resolve = await updateEmail(req as unknown as Parameters<typeof updateEmail>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "account_email_update", err);
  }
};

export const password = async (req: Request, res: Response) => {
  try {
    const resolve = await updatePassword(req as unknown as Parameters<typeof updatePassword>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "account_password_update", err);
  }
};

export const onboardingTips = async (req: Request, res: Response) => {
  try {
    const resolve = await onboardingTipsService(
      req as unknown as Parameters<typeof onboardingTipsService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "account_onboarding_tips", err);
  }
};

export const updateTips = async (req: Request, res: Response) => {
  try {
    const resolve = await updateOnboardingTips(
      req as unknown as Parameters<typeof updateOnboardingTips>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "account_onboarding_tips_update", err);
  }
};

export const deleteGoogleIntent = async (req: Request, res: Response) => {
  try {
    const resolve = await createDeleteGoogleIntent(
      req as unknown as Parameters<typeof createDeleteGoogleIntent>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "account_delete_google_intent", err);
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    const resolve = await destroyService(req as unknown as Parameters<typeof destroyService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "account_delete", err);
  }
};
