import { Router } from "express";
import { videoAssetActionValidator } from "@/modules/video-assets/http-validation";
import { playback } from "./use-cases/controller";

const routes = Router();

routes.get("/:id/playback", videoAssetActionValidator, playback);

export default routes;
