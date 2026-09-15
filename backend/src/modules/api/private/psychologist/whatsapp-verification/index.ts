import { Router } from "express";
import { getLimiter } from "@/external/limiter";
import { confirmVerification, requestVerification } from "./use-cases/controller";
import { confirmValidator, requestValidator } from "./validator";

const routes = Router();
const requestLimiter = getLimiter({ window: 10, max: 5 });
const confirmLimiter = getLimiter({ window: 10, max: 10 });

routes.post("/request", requestLimiter, requestValidator, requestVerification);
routes.post("/confirm", confirmLimiter, confirmValidator, confirmVerification);

export default routes;
