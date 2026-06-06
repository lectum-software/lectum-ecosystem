import { Router } from "express";
import { confirm, search } from "./use-cases/controller";
import { confirmValidator, searchValidator } from "./validator";

const routes = Router();

routes.post("/search", searchValidator, search);
routes.post("/confirm", confirmValidator, confirm);

export default routes;
