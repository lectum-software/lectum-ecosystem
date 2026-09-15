import { Router } from "express";
import { index } from "./use-cases/controller";

const routes = Router();

routes.get("", index);

export default routes;
