import { Router } from "express";
import { updatePersonalData } from "./use-cases/controller";
import { updatePersonalDataValidator } from "./validator";

const routes = Router();

routes.put("/:id/personal-data", updatePersonalDataValidator, updatePersonalData);

export default routes;
