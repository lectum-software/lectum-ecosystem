import { Router } from "express";
import { exportCsv, index } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.get("/export", validator, exportCsv);
routes.get("", validator, index);

export default routes;
