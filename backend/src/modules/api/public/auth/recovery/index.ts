//Lib
import { Router } from "express";

//Controllers
import { recovery } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();

//Routes
routes.post("", validator, recovery);

export default routes;
