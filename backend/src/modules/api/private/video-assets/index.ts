import { Router } from "express";
import { destroy, playback, status, store } from "./use-cases/controller";
import { actionValidator, uploadValidator } from "./validator";

const routes = Router();

routes.post("/uploads", uploadValidator, store);
routes.get("/:id/status", actionValidator, status);
routes.get("/:id/playback", actionValidator, playback);
routes.delete("/:id", actionValidator, destroy);

export default routes;
