//Lib
import { Router } from "express";

//Controllers
import { store } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();

//Routes

routes.post("", validator, store);

export default routes;
