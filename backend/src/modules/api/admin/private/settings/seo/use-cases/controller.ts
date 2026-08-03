import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import type { IAdminSettingsSeoDTO } from "../DTOs/IAdminSettingsSeoDTO";
import { index as indexService, update as updateService } from "./services";

const dto = (req: Request): IAdminSettingsSeoDTO => ({
  admin: req.admin,
  b: req.b,
  p: req.p,
});

export const index = async (_req: Request, res: Response) => {
  try {
    return send(res, await indexService());
  } catch (err) {
    return error500(res, "admin_settings_seo_index", err);
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    return send(res, await updateService(dto(req)));
  } catch (err) {
    return error500(res, "admin_settings_seo_update", err);
  }
};
