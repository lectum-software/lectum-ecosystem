//Lib
import { Router } from "express";

//Controllers
import { reset } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();

//Routes
routes.post("/:code", validator, reset);

export default routes;
