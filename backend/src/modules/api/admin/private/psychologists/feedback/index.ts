import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { reports, resolveReport, reviews, startReportReview } from "./use-cases/controller";
import {
  reportsValidator,
  resolveReportValidator,
  reviewsValidator,
  startReportReviewValidator,
} from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/:id/reviews", reviewsValidator, reviews);
routes.get("/:id/reports", reportsValidator, reports);
routes.post("/:id/reports/:reportId/start-review", startReportReviewValidator, startReportReview);
routes.post("/:id/reports/:reportId/resolve", resolveReportValidator, resolveReport);

export default routes;
