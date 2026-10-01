import { Router } from "express";
import { list } from "./use-cases/controller";
import { listValidator } from "./validator";

const routes = Router();
routes.get("/", listValidator, list);
export default routes;
