import { Router } from "express";
import { correct, create, index, voidEntry } from "./use-cases/controller";
import { correctValidator, createValidator, listValidator, voidValidator } from "./validator";

const routes = Router();
routes.get("/", listValidator, index);
routes.post("/", createValidator, create);
routes.put("/:id", correctValidator, correct);
routes.post("/:id/void", voidValidator, voidEntry);
export default routes;
