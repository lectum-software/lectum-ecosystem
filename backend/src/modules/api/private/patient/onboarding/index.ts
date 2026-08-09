import { Router } from "express";
import { update } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.put(
  "",
  (req, res, next) =>
    validator(req, res, (e: Error) => {
      if (!e) return next();
    }),
  update,
);

export default routes;
