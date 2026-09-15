import { Router } from "express";
import { cancel, grant, revoke, show } from "./use-cases/controller";
import { cancelValidator, grantValidator, revokeValidator, showValidator } from "./validator";

const routes = Router();

routes.get("/:id/billing", showValidator, show);
routes.post("/:id/billing/grant-courtesy", grantValidator, grant);
routes.post("/:id/billing/revoke-courtesy", revokeValidator, revoke);
routes.post("/:id/billing/subscription/cancel", cancelValidator, cancel);

export default routes;
