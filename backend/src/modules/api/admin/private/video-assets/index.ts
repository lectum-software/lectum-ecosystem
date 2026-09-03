import { Router } from "express";
import { playback } from "./use-cases/controller";
import { playbackValidator } from "./validator";

const routes = Router();

routes.get("/:id/playback", playbackValidator, playback);

export default routes;
