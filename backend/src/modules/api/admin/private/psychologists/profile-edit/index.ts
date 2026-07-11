import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { updatePersonalData, updateProfessionalData } from "./use-cases/controller";
import { updatePersonalDataValidator, updateProfessionalDataValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.put("/:id/personal-data", updatePersonalDataValidator, updatePersonalData);
routes.put("/:id/professional-data", updateProfessionalDataValidator, updateProfessionalData);

export default routes;
