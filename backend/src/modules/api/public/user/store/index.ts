//Lib
import { Router } from "express";
import { getLimiter } from "@/external/limiter";

//Controllers
import { store } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();
const limiter = getLimiter({ window: 15, max: 10 });

//Routes

routes.post("", limiter, validator, store);

export default routes;
