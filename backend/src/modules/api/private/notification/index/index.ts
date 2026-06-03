//Lib
import { Router } from "express";

//Controllers
import { index } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();

//Middlewares
import middlewares from "../../../middlewares";

//Routes
routes.get(
  "",
  middlewares,
  (req, res, next) =>
    validator(req, res, (e: Error) => {
      if (!e) return next();
    }),
  index,
);

export default routes;
