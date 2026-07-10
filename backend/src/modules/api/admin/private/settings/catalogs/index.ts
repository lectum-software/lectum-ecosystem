import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import {
  createApproach,
  createCategory,
  createLanguage,
  createService,
  createSpecialty,
  createTargetAudience,
  index,
  reorder,
  restoreDefaults,
  updateApproach,
  updateCategory,
  updateLanguage,
  updateService,
  updateSpecialty,
  updateTargetAudience,
} from "./use-cases/controller";
import {
  createCategoryValidator,
  createItemValidator,
  createSpecialtyValidator,
  indexValidator,
  reorderValidator,
  restoreDefaultsValidator,
  updateCategoryValidator,
  updateItemValidator,
  updateSpecialtyValidator,
} from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/", indexValidator, index);
routes.post("/restore-defaults", restoreDefaultsValidator, restoreDefaults);
routes.post("/reorder", reorderValidator, reorder);
routes.post("/specialty-categories", createCategoryValidator, createCategory);
routes.put("/specialty-categories/:id", updateCategoryValidator, updateCategory);
routes.post("/specialties", createSpecialtyValidator, createSpecialty);
routes.put("/specialties/:id", updateSpecialtyValidator, updateSpecialty);
routes.post("/approaches", createItemValidator, createApproach);
routes.put("/approaches/:id", updateItemValidator, updateApproach);
routes.post("/services", createItemValidator, createService);
routes.put("/services/:id", updateItemValidator, updateService);
routes.post("/languages", createItemValidator, createLanguage);
routes.put("/languages/:id", updateItemValidator, updateLanguage);
routes.post("/target-audiences", createItemValidator, createTargetAudience);
routes.put("/target-audiences/:id", updateItemValidator, updateTargetAudience);

export default routes;
