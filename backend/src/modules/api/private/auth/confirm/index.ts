//Lib
import { Router } from "express";

//Controllers
import { confirm } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();

//Middlewares
import middlewares from "../../../middlewares/_auth";

//Routes
routes.get("", middlewares, validator, confirm);

export default routes;
