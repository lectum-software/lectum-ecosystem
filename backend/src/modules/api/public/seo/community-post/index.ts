import { Router } from "express";
import { showPost, showReply } from "./use-cases/controller";
import { showPostValidator, showReplyValidator } from "./validator";

const routes = Router();

routes.get("/:slug/:id/replies/:replyId", showReplyValidator, showReply);
routes.get("/:slug/:id", showPostValidator, showPost);

export default routes;
