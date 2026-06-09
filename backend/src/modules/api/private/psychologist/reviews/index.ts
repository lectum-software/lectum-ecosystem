import { Router } from "express";
import { index, respond } from "./use-cases/controller";
import { indexValidator, respondValidator } from "./validator";

const routes = Router();

routes.get("", indexValidator, index);
routes.post("/:id/response", respondValidator, respond);

export default routes;
