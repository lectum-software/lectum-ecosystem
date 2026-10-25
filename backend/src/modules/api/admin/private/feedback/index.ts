import { Router } from "express";
import { attachment, count, detail, list, update } from "./use-cases/controller";
import { attachmentValidator, detailValidator, listValidator, updateValidator } from "./validator";

const routes = Router();
routes.use((_req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  next();
});
routes.get("/count", count);
routes.get("/", listValidator, list);
routes.get("/:id/attachments/:attachmentId", attachmentValidator, attachment);
routes.get("/:id", detailValidator, detail);
routes.put("/:id", updateValidator, update);
export default routes;
