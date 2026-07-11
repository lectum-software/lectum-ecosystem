import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { approve, reject, show } from "./use-cases/controller";
import { approveValidator, rejectValidator, showValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/:id/registry-verification", showValidator, show);
routes.post("/:id/registry-verification/approve", approveValidator, approve);
routes.post("/:id/registry-verification/reject", rejectValidator, reject);

export default routes;
