import { Router } from "express";
import { reports } from "./use-cases/controller";
import { reportsValidator } from "./validator";

const routes = Router();

routes.get("/:id/reports", reportsValidator, reports);

export default routes;
