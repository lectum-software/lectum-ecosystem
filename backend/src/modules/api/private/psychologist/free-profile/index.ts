import { Router } from "express";
import { show, update } from "./use-cases/controller";

const routes = Router();

routes.get("", show);
routes.put("", update);

export default routes;
