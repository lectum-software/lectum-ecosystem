import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { LegalError } from "@/modules/legal/contracts";
import type { LegalAdminDTO } from "../DTOs";
import * as services from "./services";
export const list = async (req: Request, res: Response) => {
  try {
    return send(res, {
      status: 200,
      ...msg("legal_loaded"),
      data: await services.list(req as unknown as LegalAdminDTO),
    });
  } catch (err) {
    if (err instanceof LegalError) return send(res, { status: err.status, ...error(err.code) });
    return error500(res, "legal_admin_list", err);
  }
};
export const detail = async (req: Request, res: Response) => {
  try {
    return send(res, {
      status: 200,
      ...msg("legal_loaded"),
      data: await services.detail(req as unknown as LegalAdminDTO),
    });
  } catch (err) {
    if (err instanceof LegalError) return send(res, { status: err.status, ...error(err.code) });
    return error500(res, "legal_admin_detail", err);
  }
};
export const create = async (req: Request, res: Response) => {
  try {
    return send(res, {
      status: 200,
      ...msg("legal_saved"),
      data: await services.create(req as unknown as LegalAdminDTO),
    });
  } catch (err) {
    if (err instanceof LegalError) return send(res, { status: err.status, ...error(err.code) });
    return error500(res, "legal_admin_create", err);
  }
};
export const edit = async (req: Request, res: Response) => {
  try {
    return send(res, {
      status: 200,
      ...msg("legal_saved"),
      data: await services.edit(req as unknown as LegalAdminDTO),
    });
  } catch (err) {
    if (err instanceof LegalError) return send(res, { status: err.status, ...error(err.code) });
    return error500(res, "legal_admin_edit", err);
  }
};
export const duplicate = async (req: Request, res: Response) => {
  try {
    return send(res, {
      status: 200,
      ...msg("legal_saved"),
      data: await services.duplicate(req as unknown as LegalAdminDTO),
    });
  } catch (err) {
    if (err instanceof LegalError) return send(res, { status: err.status, ...error(err.code) });
    return error500(res, "legal_admin_duplicate", err);
  }
};
export const publish = async (req: Request, res: Response) => {
  try {
    return send(res, {
      status: 200,
      ...msg("legal_saved"),
      data: await services.publish(req as unknown as LegalAdminDTO),
    });
  } catch (err) {
    if (err instanceof LegalError) return send(res, { status: err.status, ...error(err.code) });
    return error500(res, "legal_admin_publish", err);
  }
};
export const acceptances = async (req: Request, res: Response) => {
  try {
    return send(res, {
      status: 200,
      ...msg("legal_loaded"),
      data: await services.acceptances(req as unknown as LegalAdminDTO),
    });
  } catch (err) {
    if (err instanceof LegalError) return send(res, { status: err.status, ...error(err.code) });
    return error500(res, "legal_admin_acceptances", err);
  }
};
