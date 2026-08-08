import { Router } from "express";
import { approve, reject, show, updateIdentity } from "./use-cases/controller";
import {
  approveValidator,
  rejectValidator,
  showValidator,
  updateIdentityValidator,
} from "./validator";

const routes = Router();

routes.get("/:id/registry-verification", showValidator, show);
routes.put("/:id/registry-verification/identity", updateIdentityValidator, updateIdentity);
routes.post("/:id/registry-verification/approve", approveValidator, approve);
routes.post("/:id/registry-verification/reject", rejectValidator, reject);

export default routes;
