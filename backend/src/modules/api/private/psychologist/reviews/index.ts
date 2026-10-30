import { Router } from "express";
import { index, removeResponse, respond, visibility } from "./use-cases/controller";
import {
  indexValidator,
  respondValidator,
  reviewIdValidator,
  visibilityValidator,
} from "./validator";

const routes = Router();

routes.get("", indexValidator, index);
routes.post("/:id/response", respondValidator, respond);
routes.delete("/:id/response", reviewIdValidator, removeResponse);
routes.put("/:id/visibility", visibilityValidator, visibility);

export default routes;
