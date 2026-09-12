import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { LegalError } from "@/modules/legal/contracts";
import * as services from "./services";
export const current = async (_req: Request, res: Response) => {
  try {
    return send(res, { status: 200, ...msg("legal_loaded"), data: await services.current() });
  } catch (err) {
    if (err instanceof LegalError) return send(res, { status: err.status, ...error(err.code) });
    return error500(res, "legal_public_current", err);
  }
};
export const detail = async (req: Request, res: Response) => {
  try {
    return send(res, {
      status: 200,
      ...msg("legal_loaded"),
      data: await services.detail(req.p.id),
    });
  } catch (err) {
    if (err instanceof LegalError) return send(res, { status: err.status, ...error(err.code) });
    return error500(res, "legal_public_detail", err);
  }
};
