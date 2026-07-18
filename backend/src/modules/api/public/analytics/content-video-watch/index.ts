import { Router } from "express";
import optionalAuth from "../../../middlewares/optional-auth";
import { store } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.post("", optionalAuth, validator, store);

export default routes;
