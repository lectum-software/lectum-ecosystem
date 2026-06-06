import { Router } from "express";
import { destroy, store } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.post("/:id", validator, store);
routes.delete("/:id", validator, destroy);

export default routes;
