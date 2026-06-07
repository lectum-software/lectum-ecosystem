import { Router } from "express";
import { confirmVerification, requestVerification } from "./use-cases/controller";
import { confirmValidator, requestValidator } from "./validator";

const routes = Router();

routes.post("/request", requestValidator, requestVerification);
routes.post("/confirm", confirmValidator, confirmVerification);

export default routes;
