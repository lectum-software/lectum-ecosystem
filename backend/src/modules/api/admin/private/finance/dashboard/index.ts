import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { exportCsv, index } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/export", validator, exportCsv);
routes.get("", validator, index);

export default routes;
