import { Router } from "express";
import optionalAuth from "../../../middlewares/optional-auth";
import { create, updateDuration } from "./use-cases/controller";
import { createValidator, durationValidator } from "./validator";

const routes = Router();

routes.post("", optionalAuth, createValidator, create);
routes.post("/:id/duration", durationValidator, updateDuration);

export default routes;
