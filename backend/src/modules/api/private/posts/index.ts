import { Router } from "express";
import { createReply, replies, save, show, unsave, vote } from "./use-cases/controller";
import {
  createReplyValidator,
  repliesValidator,
  saveValidator,
  showValidator,
  voteValidator,
} from "./validator";

const routes = Router();

routes.get("/:id/replies", repliesValidator, replies);
routes.post("/:id/replies", createReplyValidator, createReply);
routes.post("/:id/vote", voteValidator, vote);
routes.post("/:id/save", saveValidator, save);
routes.delete("/:id/save", saveValidator, unsave);
routes.get("/:id", showValidator, show);

export default routes;
