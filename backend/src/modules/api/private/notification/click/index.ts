import { Router } from "express";
import middlewares from "../../../middlewares";
import { click } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.post(
  "/:id/click",
  middlewares,
  (req, res, next) =>
    validator(req, res, (e: Error) => {
      if (!e) return next();
    }),
  click,
);

export default routes;
