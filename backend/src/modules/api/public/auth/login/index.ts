//Lib
import { Router } from "express";
//
//Middlewares
import { getLimiter } from "@/external/limiter";
//Controllers
import { login } from "./use-cases/controller";
//Validations
import validator from "./validator";

//Route Infos
const routes = Router();

//
const limiter = getLimiter({ window: 2, max: 10 });

//Routes
routes.post(
  "",
  //
  limiter,

  validator,
  login,
);

export default routes;
