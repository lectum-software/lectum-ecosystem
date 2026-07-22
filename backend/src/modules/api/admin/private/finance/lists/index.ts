import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { charges, subscriptions } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/charges", validator, charges);
routes.get("/subscriptions", validator, subscriptions);

export default routes;
