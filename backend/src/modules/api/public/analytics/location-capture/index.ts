import { Router } from "express";
import { capture } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.post(
  "",
  (req, res, next) =>
    validator(req, res, (e: Error) => {
      if (!e) return next();
    }),
  capture,
);

export default routes;
