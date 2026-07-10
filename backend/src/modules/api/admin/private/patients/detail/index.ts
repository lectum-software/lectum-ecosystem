import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { show } from "./use-cases/controller";
import { showValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/:id", showValidator, show);

export default routes;
