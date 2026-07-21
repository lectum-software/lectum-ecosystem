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
  deleteApproach,
  deleteCategory,
  deleteGender,
  deleteLanguage,
  deleteRaceColor,
  deleteReligion,
  deleteService,
  deleteSpecialty,
  deleteTargetAudience,
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
  deleteCategoryValidator,
  deleteItemValidator,
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
routes.delete("/specialty-categories/:id", deleteCategoryValidator, deleteCategory);
routes.post("/specialties", createSpecialtyValidator, createSpecialty);
routes.put("/specialties/:id", updateSpecialtyValidator, updateSpecialty);
routes.delete("/specialties/:id", deleteItemValidator, deleteSpecialty);
routes.post("/approaches", createItemValidator, createApproach);
routes.put("/approaches/:id", updateItemValidator, updateApproach);
routes.delete("/approaches/:id", deleteItemValidator, deleteApproach);
routes.post("/services", createItemValidator, createService);
routes.put("/services/:id", updateItemValidator, updateService);
routes.delete("/services/:id", deleteItemValidator, deleteService);
routes.post("/languages", createItemValidator, createLanguage);
routes.put("/languages/:id", updateItemValidator, updateLanguage);
routes.delete("/languages/:id", deleteItemValidator, deleteLanguage);
routes.post("/target-audiences", createItemValidator, createTargetAudience);
routes.put("/target-audiences/:id", updateItemValidator, updateTargetAudience);
routes.delete("/target-audiences/:id", deleteItemValidator, deleteTargetAudience);
routes.post("/genders", createItemValidator, createGender);
routes.put("/genders/:id", updateItemValidator, updateGender);
routes.delete("/genders/:id", deleteItemValidator, deleteGender);
routes.post("/race-colors", createItemValidator, createRaceColor);
routes.put("/race-colors/:id", updateItemValidator, updateRaceColor);
routes.delete("/race-colors/:id", deleteItemValidator, deleteRaceColor);
routes.post("/religions", createItemValidator, createReligion);
routes.put("/religions/:id", updateItemValidator, updateReligion);
routes.delete("/religions/:id", deleteItemValidator, deleteReligion);

export default routes;
