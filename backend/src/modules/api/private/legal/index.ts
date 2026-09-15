import { Router } from "express";
import * as actions from "./use-cases/controller";
import * as v from "./validator";

const routes = Router();
routes.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
routes.get("/status", v.statusValidator, actions.status);
routes.post("/accept", v.acceptValidator, actions.accept);
export default routes;
