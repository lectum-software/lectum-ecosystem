import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { updatePersonalData } from "./use-cases/controller";
import { updatePersonalDataValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.put("/:id/personal-data", updatePersonalDataValidator, updatePersonalData);

export default routes;
