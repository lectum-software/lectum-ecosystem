import type { NextFunction, Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import type {
  IAdminSettingsSeoDTO,
  IAdminSettingsSeoUploadImageDTO,
} from "../DTOs/IAdminSettingsSeoDTO";
import {
  authorizeUploadImage as authorizeUploadImageService,
  index as indexService,
  update as updateService,
  uploadImage as uploadImageService,
} from "./services";

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

export const authorizeUploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resolve = await authorizeUploadImageService(dto(req));

    if (resolve.status && resolve.status >= 400) return send(res, resolve);

    return next();
  } catch (err) {
    return error500(res, "admin_settings_seo_upload_image_authorize", err);
  }
};

export const uploadImage = async (req: Request, res: Response) => {
  try {
    return send(res, await uploadImageService(req as unknown as IAdminSettingsSeoUploadImageDTO));
  } catch (err) {
    return error500(res, "admin_settings_seo_upload_image", err);
  }
};
