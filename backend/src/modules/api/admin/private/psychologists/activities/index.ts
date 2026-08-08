import { Router } from "express";
import { activities } from "./use-cases/controller";
import { activitiesValidator } from "./validator";

const routes = Router();

routes.get("/:id/activities", activitiesValidator, activities);

export default routes;
