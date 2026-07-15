import { Router } from "express";
import adminAuth from "../../middlewares/_auth";
import { detail, events, resolve, review, summary } from "./use-cases/controller";
import { eventsValidator, eventValidator, resolveValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/summary", summary);
routes.get("/events", eventsValidator, events);
routes.get("/events/:id", eventValidator, detail);
routes.post("/events/:id/review", eventValidator, review);
routes.post("/events/:id/resolve", resolveValidator, resolve);

export default routes;
