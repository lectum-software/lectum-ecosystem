import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  changeAdminPatientAccountEmail,
  deactivateAdminPatientAccount,
  deleteAdminPatientAccount,
  revokeAdminPatientAccountSessions,
  sendAdminPatientAccountEmailConfirmation,
  sendAdminPatientAccountPasswordReset,
  setAdminPatientAccountTemporaryPassword,
  showAdminPatientAccount,
  suspendAdminPatientAccount,
} from "./services";

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showAdminPatientAccount(
      req as unknown as Parameters<typeof showAdminPatientAccount>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_account_show", err);
  }
};

export const changeEmail = async (req: Request, res: Response) => {
  try {
    const resolve = await changeAdminPatientAccountEmail(
      req as unknown as Parameters<typeof changeAdminPatientAccountEmail>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_account_change_email", err);
  }
};

export const sendEmailConfirmation = async (req: Request, res: Response) => {
  try {
    const resolve = await sendAdminPatientAccountEmailConfirmation(
      req as unknown as Parameters<typeof sendAdminPatientAccountEmailConfirmation>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_account_send_email_confirmation", err);
  }
};

export const sendPasswordReset = async (req: Request, res: Response) => {
  try {
    const resolve = await sendAdminPatientAccountPasswordReset(
      req as unknown as Parameters<typeof sendAdminPatientAccountPasswordReset>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_account_send_password_reset", err);
  }
};

export const setTemporaryPassword = async (req: Request, res: Response) => {
  try {
    const resolve = await setAdminPatientAccountTemporaryPassword(
      req as unknown as Parameters<typeof setAdminPatientAccountTemporaryPassword>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_account_set_temporary_password", err);
  }
};

export const suspendAccount = async (req: Request, res: Response) => {
  try {
    const resolve = await suspendAdminPatientAccount(
      req as unknown as Parameters<typeof suspendAdminPatientAccount>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_account_suspend", err);
  }
};

export const deactivateAccount = async (req: Request, res: Response) => {
  try {
    const resolve = await deactivateAdminPatientAccount(
      req as unknown as Parameters<typeof deactivateAdminPatientAccount>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_account_deactivate", err);
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const resolve = await deleteAdminPatientAccount(
      req as unknown as Parameters<typeof deleteAdminPatientAccount>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_account_delete", err);
  }
};

export const revokeSessions = async (req: Request, res: Response) => {
  try {
    const resolve = await revokeAdminPatientAccountSessions(
      req as unknown as Parameters<typeof revokeAdminPatientAccountSessions>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_patient_account_revoke_sessions", err);
  }
};
