import { Router } from "express";
import { index } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.get("", validator, index);

export default routes;
