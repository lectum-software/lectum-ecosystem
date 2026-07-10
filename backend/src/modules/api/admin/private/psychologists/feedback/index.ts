import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { reports, reviews } from "./use-cases/controller";
import { reportsValidator, reviewsValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/:id/reviews", reviewsValidator, reviews);
routes.get("/:id/reports", reportsValidator, reports);

export default routes;
