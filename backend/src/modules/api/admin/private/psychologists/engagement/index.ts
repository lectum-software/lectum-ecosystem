import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { publications, statistics } from "./use-cases/controller";
import { publicationsValidator, statisticsValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/:id/statistics", statisticsValidator, statistics);
routes.get("/:id/publications", publicationsValidator, publications);

export default routes;
