import { Router } from "express";
import { showPost, showReply } from "./use-cases/controller";
import { listReels, showReel } from "./use-cases/reel";
import { showPostValidator, showReelValidator, showReplyValidator } from "./validator";

const routes = Router();

routes.get("/:slug/:id/videos/:videoId/thumbnail", showReelValidator, showReel);
routes.get("/:slug/:id/videos/:videoId/content", showReelValidator, showReel);
routes.get("/:slug/:id/videos/:videoId", showReelValidator, showReel);
routes.get("/:slug/:id/videos", showPostValidator, listReels);

routes.get("/:slug/:id/replies/:replyId", showReplyValidator, showReply);
routes.get("/:slug/:id", showPostValidator, showPost);

export default routes;
