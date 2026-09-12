import { Router } from "express";
import * as actions from "./use-cases/controller";
import * as v from "./validator";

const routes = Router();
routes.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
routes.get("/", v.listValidator, actions.list);
routes.post("/", v.createValidator, actions.create);
routes.get("/:id/acceptances", v.acceptancesValidator, actions.acceptances);
routes.get("/:id", v.detailValidator, actions.detail);
routes.put("/:id", v.editValidator, actions.edit);
routes.post("/:id/duplicate", v.detailValidator, actions.duplicate);
routes.post("/:id/publish", v.publishValidator, actions.publish);
export default routes;
