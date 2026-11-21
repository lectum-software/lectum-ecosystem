import { Router } from "express";
import { guardMeasurementIdentity } from "@/modules/marketing/internal-measurement";
import optionalAuth from "../../../middlewares/optional-auth";
import { store } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.post("", optionalAuth, guardMeasurementIdentity, validator, store);

export default routes;
