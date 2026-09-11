import { Router } from "express";
import { cancelUpload, destroy, status, store } from "./use-cases/controller";
import { actionValidator, uploadValidator } from "./validator";

const routes = Router();

routes.post("/uploads", uploadValidator, store);
routes.delete("/uploads/:id", actionValidator, cancelUpload);
routes.get("/:id/status", actionValidator, status);
routes.delete("/:id", actionValidator, destroy);

export default routes;
