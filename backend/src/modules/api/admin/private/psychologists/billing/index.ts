import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { grant, revoke, show } from "./use-cases/controller";
import { grantValidator, revokeValidator, showValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/:id/billing", showValidator, show);
routes.post("/:id/billing/grant-courtesy", grantValidator, grant);
routes.post("/:id/billing/revoke-courtesy", revokeValidator, revoke);

export default routes;
