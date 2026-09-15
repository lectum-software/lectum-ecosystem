import { Router } from "express";
import { show } from "./use-cases/controller";
import { showValidator } from "./validator";

const routes = Router();

routes.get("/:id", showValidator, show);

export default routes;
