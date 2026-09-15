import { Router } from "express";
import { index } from "./use-cases/controller";
import { indexValidator } from "./validator";

const routes = Router();

routes.get("/", indexValidator, index);

export default routes;
