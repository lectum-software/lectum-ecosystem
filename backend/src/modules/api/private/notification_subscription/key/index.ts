//Lib
import { Router } from "express";
//Middlewares
import middlewares from "../../../middlewares/_auth";
//Controllers
import { key } from "./use-cases/controller";

// GET sem corpo: não usa validator (evita falha de "invalid_structure" em body vazio).
const routes = Router();

routes.get("", middlewares, key);

export default routes;
