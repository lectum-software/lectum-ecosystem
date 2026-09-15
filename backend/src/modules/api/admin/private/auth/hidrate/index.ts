import { Router } from "express";
import { hidrate } from "./use-cases/controller";

const routes = Router();

routes.get("", hidrate);

export default routes;
