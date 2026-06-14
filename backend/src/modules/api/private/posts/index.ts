import { Router } from "express";
import {
  createReply,
  mine,
  replies,
  save,
  saved,
  saveReply,
  show,
  unsave,
  unsaveReply,
  vote,
} from "./use-cases/controller";
import {
  createReplyValidator,
  listValidator,
  repliesValidator,
  replySaveValidator,
  saveValidator,
  showValidator,
  voteValidator,
} from "./validator";

const routes = Router();

routes.get("/mine", listValidator, mine);
routes.get("/saved", listValidator, saved);
routes.get("/:id/replies", repliesValidator, replies);
routes.post("/:id/replies", createReplyValidator, createReply);
routes.post("/:id/replies/:replyId/save", replySaveValidator, saveReply);
routes.delete("/:id/replies/:replyId/save", replySaveValidator, unsaveReply);
routes.post("/:id/vote", voteValidator, vote);
routes.post("/:id/save", saveValidator, save);
routes.delete("/:id/save", saveValidator, unsave);
routes.get("/:id", showValidator, show);

export default routes;
