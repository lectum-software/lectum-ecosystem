import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  changeAdminPsychologistAccountEmail,
  deactivateAdminPsychologistAccount,
  deleteAdminPsychologistAccount,
  revokeAdminPsychologistAccountSessions,
  sendAdminPsychologistAccountEmailConfirmation,
  sendAdminPsychologistAccountPasswordReset,
  setAdminPsychologistAccountTemporaryPassword,
  showAdminPsychologistAccount,
  startAdminPsychologistAccountViewAs,
  suspendAdminPsychologistAccount,
} from "./services";

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPsychologistAccount(
      req as unknown as Parameters<typeof showAdminPsychologistAccount>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_account_show", err);
  }
};

export const changeEmail = async (req: Request, res: Response) => {
  try {
    const resolve = await changeAdminPsychologistAccountEmail(
      req as unknown as Parameters<typeof changeAdminPsychologistAccountEmail>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_account_change_email", err);
  }
};

export const sendEmailConfirmation = async (req: Request, res: Response) => {
  try {
    const resolve = await sendAdminPsychologistAccountEmailConfirmation(
      req as unknown as Parameters<typeof sendAdminPsychologistAccountEmailConfirmation>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_account_send_email_confirmation", err);
  }
};

export const sendPasswordReset = async (req: Request, res: Response) => {
  try {
    const resolve = await sendAdminPsychologistAccountPasswordReset(
      req as unknown as Parameters<typeof sendAdminPsychologistAccountPasswordReset>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_account_send_password_reset", err);
  }
};

export const setTemporaryPassword = async (req: Request, res: Response) => {
  try {
    const resolve = await setAdminPsychologistAccountTemporaryPassword(
      req as unknown as Parameters<typeof setAdminPsychologistAccountTemporaryPassword>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_account_set_temporary_password", err);
  }
};

export const suspendAccount = async (req: Request, res: Response) => {
  try {
    const resolve = await suspendAdminPsychologistAccount(
      req as unknown as Parameters<typeof suspendAdminPsychologistAccount>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_account_suspend", err);
  }
};

export const deactivateAccount = async (req: Request, res: Response) => {
  try {
    const resolve = await deactivateAdminPsychologistAccount(
      req as unknown as Parameters<typeof deactivateAdminPsychologistAccount>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_account_deactivate", err);
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const resolve = await deleteAdminPsychologistAccount(
      req as unknown as Parameters<typeof deleteAdminPsychologistAccount>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_account_delete", err);
  }
};

export const startViewAs = async (req: Request, res: Response) => {
  try {
    const resolve = await startAdminPsychologistAccountViewAs(
      req as unknown as Parameters<typeof startAdminPsychologistAccountViewAs>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_account_view_as", err);
  }
};

export const revokeSessions = async (req: Request, res: Response) => {
  try {
    const resolve = await revokeAdminPsychologistAccountSessions(
      req as unknown as Parameters<typeof revokeAdminPsychologistAccountSessions>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_account_revoke_sessions", err);
  }
};
