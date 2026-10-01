import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import type { IAdminGlobalContentDTO } from "../DTOs/IAdminGlobalContentDTO";
import { listContent } from "./services";

export const list = async (req: Request, res: Response) => {
  try {
    return send(res, await listContent(req as IAdminGlobalContentDTO));
  } catch (err) {
    return error500(res, "admin_global_content", err);
  }
};
