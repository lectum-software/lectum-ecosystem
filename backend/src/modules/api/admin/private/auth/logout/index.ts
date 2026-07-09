import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { logout } from "./use-cases/controller";

const routes = Router();

routes.use(adminAuth);
routes.post("", logout);

export default routes;
