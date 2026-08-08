//Lib
import { Router } from "express";
import { getLimiter } from "@/external/limiter";

//Controllers
import { confirm } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();
const limiter = getLimiter({ window: 10, max: 5 });

//Middlewares
import middlewares from "../../../middlewares/_auth";

//Routes
routes.get("", middlewares, limiter, validator, confirm);

export default routes;
