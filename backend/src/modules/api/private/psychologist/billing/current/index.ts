import { Router } from "express";
import { show } from "./use-cases/controller";

const routes = Router();

routes.get("", show);

export default routes;
