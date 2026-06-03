//Lib
import { Router } from "express";
//Middlewares
import middlewares from "../../../middlewares";
//Controllers
import { show } from "./use-cases/controller";

const routes = Router();

routes.get("", middlewares, show);

export default routes;
