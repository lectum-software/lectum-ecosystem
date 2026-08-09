//Lib
import { Router } from "express";

//Controllers
import { hidrate } from "./use-cases/controller";

//Route Infos
const routes = Router();

//Middlewares
import middlewares from "../../../middlewares/_auth";

routes.use(middlewares);

//Routes
routes.get("", hidrate);

export default routes;
