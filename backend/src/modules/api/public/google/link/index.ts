import { Router } from "express";
import privateAuth from "@/modules/api/middlewares/_auth";
import { createIntent, unlink } from "./use-cases/controller";

const routes = Router();

routes.post("/intent", privateAuth, createIntent);
routes.delete("", privateAuth, unlink);

export default routes;
