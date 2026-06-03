//Lib
import { Router } from "express";
//Middlewares
import middlewares from "../../../middlewares";
//Controllers
import { update } from "./use-cases/controller";
//Validations
import validator from "./validator";

const routes = Router();

routes.put(
  "",
  middlewares,
  (req, res, next) =>
    validator(req, res, (e: Error) => {
      if (!e) return next();
    }),
  update,
);

export default routes;
