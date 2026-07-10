import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { grant, show } from "./use-cases/controller";
import { grantValidator, showValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/:id/billing", showValidator, show);
routes.post("/:id/billing/grant-courtesy", grantValidator, grant);

export default routes;
