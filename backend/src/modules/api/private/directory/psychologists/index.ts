import { Router } from "express";
import middlewares from "../../../middlewares/_auth";
import { index } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.use(middlewares);

routes.get(
  "",
  (req, res, next) =>
    validator(req, res, (e: Error) => {
      if (!e) return next();
    }),
  index,
);

export default routes;
