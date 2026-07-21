import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import type { IAdminSettingsCatalogsDTO } from "../DTOs/IAdminSettingsCatalogsDTO";
import {
  createCategory as createCategoryService,
  createItem as createItemService,
  index as indexService,
  reorder as reorderService,
  restoreDefaults as restoreDefaultsService,
  updateCategory as updateCategoryService,
  updateItem as updateItemService,
} from "./services";

const dto = (req: Request): IAdminSettingsCatalogsDTO => ({
  admin: req.admin,
  b: req.b,
  p: req.p,
});

export const index = async (_req: Request, res: Response) => {
  try {
    return send(res, await indexService());
  } catch (err) {
    return error500(res, "admin_settings_catalogs_index", err);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    return send(res, await createCategoryService(dto(req)));
  } catch (err) {
    return error500(res, "admin_settings_catalogs_category_create", err);
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    return send(res, await updateCategoryService(dto(req)));
  } catch (err) {
    return error500(res, "admin_settings_catalogs_category_update", err);
  }
};

const createItemController =
  (
    type:
      | "approach"
      | "gender"
      | "language"
      | "race_color"
      | "religion"
      | "service"
      | "target_audience"
      | "specialty",
  ) =>
  async (req: Request, res: Response) => {
    try {
      return send(res, await createItemService(type, dto(req)));
    } catch (err) {
      return error500(res, `admin_settings_catalogs_${type}_create`, err);
    }
  };

const updateItemController =
  (
    type:
      | "approach"
      | "gender"
      | "language"
      | "race_color"
      | "religion"
      | "service"
      | "target_audience"
      | "specialty",
  ) =>
  async (req: Request, res: Response) => {
    try {
      return send(res, await updateItemService(type, dto(req)));
    } catch (err) {
      return error500(res, `admin_settings_catalogs_${type}_update`, err);
    }
  };

export const createSpecialty = createItemController("specialty");
export const updateSpecialty = updateItemController("specialty");
export const createApproach = createItemController("approach");
export const updateApproach = updateItemController("approach");
export const createService = createItemController("service");
export const updateService = updateItemController("service");
export const createLanguage = createItemController("language");
export const updateLanguage = updateItemController("language");
export const createTargetAudience = createItemController("target_audience");
export const updateTargetAudience = updateItemController("target_audience");
export const createGender = createItemController("gender");
export const updateGender = updateItemController("gender");
export const createRaceColor = createItemController("race_color");
export const updateRaceColor = updateItemController("race_color");
export const createReligion = createItemController("religion");
export const updateReligion = updateItemController("religion");

export const reorder = async (req: Request, res: Response) => {
  try {
    return send(res, await reorderService(dto(req)));
  } catch (err) {
    return error500(res, "admin_settings_catalogs_reorder", err);
  }
};

export const restoreDefaults = async (req: Request, res: Response) => {
  try {
    return send(res, await restoreDefaultsService(dto(req)));
  } catch (err) {
    return error500(res, "admin_settings_catalogs_restore_defaults", err);
  }
};
