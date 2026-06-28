import { Router } from "express";
import { update } from "./use-cases/controller";
import { requestValidator } from "./validator";

const routes = Router();

routes.put("", requestValidator, update);

export default routes;
