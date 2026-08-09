import { Router } from "express";
import { store } from "./use-cases/controller";
import { requestValidator } from "./validator";

const routes = Router();

routes.post("", requestValidator, store);

export default routes;
