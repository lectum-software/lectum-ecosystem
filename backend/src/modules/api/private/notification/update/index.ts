//Lib
import { Router } from "express";

//Controllers
import { update } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();

//Middlewares
import middlewares from "../../../middlewares";

//Routes

routes.put(
  "/:id",
  middlewares,
  (req, res, next) =>
    validator(req, res, (e: Error) => {
      if (!e) return next();
    }),
  update,
);

export default routes;
