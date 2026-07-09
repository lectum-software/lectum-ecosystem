import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { hidrate } from "./use-cases/controller";

const routes = Router();

routes.use(adminAuth);
routes.get("", hidrate);

export default routes;
