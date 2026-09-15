import { Router } from "express";
import { logout } from "./use-cases/controller";

const routes = Router();

routes.post("", logout);

export default routes;
