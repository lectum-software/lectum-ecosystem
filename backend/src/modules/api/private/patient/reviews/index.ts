import { Router } from "express";
import { destroy, eligibility, index, store } from "./use-cases/controller";
import { deleteValidator, eligibilityValidator, indexValidator, storeValidator } from "./validator";

const routes = Router();

routes.get("", indexValidator, index);
routes.post("", storeValidator, store);
routes.delete("/:id", deleteValidator, destroy);
routes.get("/eligibility/:id", eligibilityValidator, eligibility);

export default routes;
