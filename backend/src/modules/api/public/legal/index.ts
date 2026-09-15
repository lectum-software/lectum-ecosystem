import { Router } from "express";
import * as actions from "./use-cases/controller";
import * as v from "./validator";

const routes = Router();
routes.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
routes.get("/current", v.currentValidator, actions.current);
routes.get("/documents/:id", v.detailValidator, actions.detail);
export default routes;
