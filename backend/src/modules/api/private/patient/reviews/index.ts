import { Router } from "express";
import { destroy, eligibility, index, pending, store, update } from "./use-cases/controller";
import {
  deleteValidator,
  eligibilityValidator,
  indexValidator,
  pendingValidator,
  storeValidator,
  updateValidator,
} from "./validator";

const routes = Router();

routes.get("/pending", pendingValidator, pending);

routes.get("", indexValidator, index);
routes.post("", storeValidator, store);
routes.put("/:id", updateValidator, update);
routes.delete("/:id", deleteValidator, destroy);
routes.get("/eligibility/:id", eligibilityValidator, eligibility);

export default routes;
