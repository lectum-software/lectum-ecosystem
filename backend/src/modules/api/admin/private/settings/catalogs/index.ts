import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import {
  createApproach,
  createCategory,
  createGender,
  createLanguage,
  createRaceColor,
  createReligion,
  createService,
  createSpecialty,
  createTargetAudience,
  index,
  reorder,
  restoreDefaults,
  updateApproach,
  updateCategory,
  updateGender,
  updateLanguage,
  updateRaceColor,
  updateReligion,
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
routes.post("/genders", createItemValidator, createGender);
routes.put("/genders/:id", updateItemValidator, updateGender);
routes.post("/race-colors", createItemValidator, createRaceColor);
routes.put("/race-colors/:id", updateItemValidator, updateRaceColor);
routes.post("/religions", createItemValidator, createReligion);
routes.put("/religions/:id", updateItemValidator, updateReligion);

export default routes;
