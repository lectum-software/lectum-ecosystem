import { Router } from "express";
import { getLimiter } from "@/external/limiter";
import { confirm, search } from "./use-cases/controller";
import { confirmValidator, searchValidator } from "./validator";

const routes = Router();
const searchLimiter = getLimiter({ window: 10, max: 10 });
const confirmLimiter = getLimiter({ window: 10, max: 20 });

routes.post("/search", searchLimiter, searchValidator, search);
routes.post("/confirm", confirmLimiter, confirmValidator, confirm);

export default routes;
