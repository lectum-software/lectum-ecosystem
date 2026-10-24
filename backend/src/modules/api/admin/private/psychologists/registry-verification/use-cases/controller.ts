import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  approveRegistryVerification,
  rejectRegistryVerification,
  showRegistryVerification,
  updateRegistryIdentity,
} from "./services";
import { saveFiscalIdentity, showFiscalIdentity } from "./services/fiscal-identity";

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showRegistryVerification(
      req as unknown as Parameters<typeof showRegistryVerification>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_registry_verification_show", err);
  }
};

export const showFiscal = async (req: Request, res: Response) => {
  try {
    return send(
      res,
      await showFiscalIdentity(req as unknown as Parameters<typeof showFiscalIdentity>[0]),
    );
  } catch (err) {
    return error500(res, "admin_fiscal_identity_show", err);
  }
};

export const saveFiscal = async (req: Request, res: Response) => {
  try {
    return send(
      res,
      await saveFiscalIdentity(req as unknown as Parameters<typeof saveFiscalIdentity>[0]),
    );
  } catch (err) {
    return error500(res, "admin_fiscal_identity_save", err);
  }
};

export const approve = async (req: Request, res: Response) => {
  try {
    const resolve = await approveRegistryVerification(
      req as unknown as Parameters<typeof approveRegistryVerification>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_registry_verification_approve", err);
  }
};

export const updateIdentity = async (req: Request, res: Response) => {
  try {
    const resolve = await updateRegistryIdentity(
      req as unknown as Parameters<typeof updateRegistryIdentity>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_registry_verification_update_identity", err);
  }
};

export const reject = async (req: Request, res: Response) => {
  try {
    const resolve = await rejectRegistryVerification(
      req as unknown as Parameters<typeof rejectRegistryVerification>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_psychologist_registry_verification_reject", err);
  }
};
