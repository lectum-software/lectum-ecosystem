import { Router } from "express";
import { getLimiter } from "@/external/limiter";
import { cancelUpload, destroy, status, store, uploadEvent } from "./use-cases/controller";
import { actionValidator, uploadEventValidator, uploadValidator } from "./validator";

const routes = Router();

routes.post("/uploads", uploadValidator, store);
routes.post(
  "/:id/upload-events",
  getLimiter({ max: 30, window: 1 }),
  uploadEventValidator,
  uploadEvent,
);
routes.delete("/uploads/:id", actionValidator, cancelUpload);
routes.get("/:id/status", actionValidator, status);
routes.delete("/:id", actionValidator, destroy);

export default routes;
