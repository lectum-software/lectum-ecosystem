import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { index } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("", validator, index);

export default routes;
