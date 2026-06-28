import { Router } from "express";
import { store } from "./use-cases/controller";

const routes = Router();

routes.post("", store);

export default routes;
