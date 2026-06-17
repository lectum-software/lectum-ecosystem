import { Router } from "express";
import multer from "@/config/multer";
import privateAuth from "@/modules/api/middlewares/_auth";
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

routes.get("/mine", privateAuth, listValidator, mine);
routes.get("/saved", privateAuth, listValidator, saved);
routes.get("/:id/replies", repliesValidator, replies);
routes.get("/:id/replies/:replyId/thread", replySaveValidator, replyThread);
routes.post(
  "/:id/replies/media",
  privateAuth,
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
routes.post("/:id/replies", privateAuth, createReplyValidator, createReply);
routes.post("/:id/replies/:replyId/save", privateAuth, replySaveValidator, saveReply);
routes.delete("/:id/replies/:replyId/save", privateAuth, replySaveValidator, unsaveReply);
routes.post("/:id/replies/:replyId/report", privateAuth, replyReportValidator, report);
routes.delete("/:id/replies/:replyId", privateAuth, replySaveValidator, deleteReply);
routes.post("/:id/vote", privateAuth, voteValidator, vote);
routes.post("/:id/save", privateAuth, saveValidator, save);
routes.delete("/:id/save", privateAuth, saveValidator, unsave);
routes.post("/:id/report", privateAuth, reportValidator, report);
routes.get("/:id", showValidator, show);

export default routes;
