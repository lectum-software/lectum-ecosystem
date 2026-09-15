import { Router } from "express";
import { getLimiter } from "@/external/limiter";
import { login } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();
const limiter = getLimiter({ window: 2, max: 10 });

routes.post("", limiter, validator, login);

export default routes;
