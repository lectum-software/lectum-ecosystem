//Lib
import { Router } from "express";

//Controllers
import { need_reset } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();

//Middlewares
import middlewares from "../../../middlewares";

//Routes
routes.post("", middlewares, validator, need_reset);

export default routes;
