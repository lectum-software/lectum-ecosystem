import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { LegalError } from "@/modules/legal/contracts";
import type { LegalUserDTO } from "../DTOs";
import * as services from "./services";
export const status = async (req: Request, res: Response) => {
  try {
    return send(res, {
      status: 200,
      ...msg("legal_loaded"),
      data: await services.status(req as unknown as LegalUserDTO),
    });
  } catch (err) {
    if (err instanceof LegalError) return send(res, { status: err.status, ...error(err.code) });
    return error500(res, "legal_private_status", err);
  }
};
export const accept = async (req: Request, res: Response) => {
  try {
    return send(res, {
      status: 200,
      ...msg("legal_saved"),
      data: await services.accept(req as unknown as LegalUserDTO),
    });
  } catch (err) {
    if (err instanceof LegalError) return send(res, { status: err.status, ...error(err.code) });
    return error500(res, "legal_private_accept", err);
  }
};
