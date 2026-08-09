//Lib
import { Router } from "express";
import { getLimiter } from "@/external/limiter";

//Controllers
import { code } from "./use-cases/controller";

//Validations
import validator from "./validator";

//Route Infos
const routes = Router();
const limiter = getLimiter({ window: 10, max: 10 });

//Middlewares
import middlewares from "../../../middlewares/_auth";

//Routes
routes.put("/:code", middlewares, limiter, validator, code);

export default routes;
