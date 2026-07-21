import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { reports } from "./use-cases/controller";
import { reportsValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/:id/reports", reportsValidator, reports);

export default routes;
