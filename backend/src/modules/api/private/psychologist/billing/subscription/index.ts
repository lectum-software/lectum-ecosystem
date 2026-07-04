import { Router } from "express";
import { cancel, show } from "./use-cases/controller";

const routes = Router();

routes.get("", show);
routes.post("/cancel", cancel);

export default routes;
