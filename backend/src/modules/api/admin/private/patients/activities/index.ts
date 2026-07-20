import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { activities } from "./use-cases/controller";
import { activitiesValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/:id/activities", activitiesValidator, activities);

export default routes;
