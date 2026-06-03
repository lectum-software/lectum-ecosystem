//Lib
import { Router } from "express";

//Controllers
import { code } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();

//Middlewares
import middlewares from "../../../middlewares/_auth";

//Routes
routes.put("/:code", middlewares, validator, code);

export default routes;
