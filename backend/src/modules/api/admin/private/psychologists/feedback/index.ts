import { Router } from "express";
import { reports, resolveReport, reviews } from "./use-cases/controller";
import { reportsValidator, resolveReportValidator, reviewsValidator } from "./validator";

const routes = Router();

routes.get("/:id/reviews", reviewsValidator, reviews);
routes.get("/:id/reports", reportsValidator, reports);
routes.post("/:id/reports/:reportId/resolve", resolveReportValidator, resolveReport);

export default routes;
