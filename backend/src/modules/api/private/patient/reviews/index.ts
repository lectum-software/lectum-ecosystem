import { Router } from "express";
import { eligibility, index, store } from "./use-cases/controller";
import { eligibilityValidator, indexValidator, storeValidator } from "./validator";

const routes = Router();

routes.get("", indexValidator, index);
routes.post("", storeValidator, store);
routes.get("/eligibility/:id", eligibilityValidator, eligibility);

export default routes;
