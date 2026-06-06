import { Router } from "express";
import { destroy, index, store } from "./use-cases/controller";
import { actionValidator, indexValidator } from "./validator";

const routes = Router();

routes.get("", indexValidator, index);
routes.post("/:id", actionValidator, store);
routes.delete("/:id", actionValidator, destroy);

export default routes;
