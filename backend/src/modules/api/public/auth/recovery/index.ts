//Lib
import { Router } from "express";
import { getLimiter } from "@/external/limiter";

//Controllers
import { recovery } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();
const limiter = getLimiter({ window: 15, max: 5 });

//Routes
routes.post("", limiter, validator, recovery);

export default routes;
