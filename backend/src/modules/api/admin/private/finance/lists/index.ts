import { Router } from "express";
import { charges, subscriptions } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.get("/charges", validator, charges);
routes.get("/subscriptions", validator, subscriptions);

export default routes;
