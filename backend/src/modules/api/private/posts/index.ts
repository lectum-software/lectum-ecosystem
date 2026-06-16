import { Router } from "express";
import multer from "@/config/multer";
import {
  authorizeReplyMediaUpload,
  createReply,
  deleteReply,
  mine,
  replies,
  replyThread,
  report,
  save,
  saved,
  saveReply,
  show,
  unsave,
  unsaveReply,
  uploadReplyMedia,
  vote,
} from "./use-cases/controller";
import {
  createReplyValidator,
  listValidator,
  repliesValidator,
  replyReportValidator,
  replySaveValidator,
  reportValidator,
  saveValidator,
  showValidator,
  voteValidator,
} from "./validator";

const routes = Router();

routes.get("/mine", listValidator, mine);
routes.get("/saved", listValidator, saved);
routes.get("/:id/replies", repliesValidator, replies);
routes.get("/:id/replies/:replyId/thread", replySaveValidator, replyThread);
routes.post(
  "/:id/replies/media",
  showValidator,
  authorizeReplyMediaUpload,
  multer({
    single: "media",
    allowed: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ],
    size: 50,
  }),
  uploadReplyMedia,
);
routes.post("/:id/replies", createReplyValidator, createReply);
routes.post("/:id/replies/:replyId/save", replySaveValidator, saveReply);
routes.delete("/:id/replies/:replyId/save", replySaveValidator, unsaveReply);
routes.post("/:id/replies/:replyId/report", replyReportValidator, report);
routes.delete("/:id/replies/:replyId", replySaveValidator, deleteReply);
routes.post("/:id/vote", voteValidator, vote);
routes.post("/:id/save", saveValidator, save);
routes.delete("/:id/save", saveValidator, unsave);
routes.post("/:id/report", reportValidator, report);
routes.get("/:id", showValidator, show);

export default routes;
