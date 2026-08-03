import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import { index, update } from "./use-cases/controller";
import { indexValidator, updateValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/", indexValidator, index);
routes.put("/:page_key", updateValidator, update);

export default routes;
