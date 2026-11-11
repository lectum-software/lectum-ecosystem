import { Router } from "express";
import { index, observe } from "./use-cases/controller";
import { listValidator, observeValidator } from "./validator";

const routes = Router();
routes.get("/", listValidator, index);
routes.post("/:receiptId/observe", observeValidator, observe);
export default routes;
