import { Router } from "express";
import { show, update } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.get("", show);
routes.put("", validator, update);

export default routes;
