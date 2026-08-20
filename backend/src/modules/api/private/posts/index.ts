import { Router } from "express";
import publicMulter from "@/config/multer";
import { UPLOAD_LIMITS } from "@/config/multer/limits";
import { createMultipartChunkMiddleware } from "@/config/multer/multipart-chunk";
import privateAuth from "@/modules/api/middlewares/_auth";
import {
  abortReplyMediaMultipartUpload,
  authorizeReplyMediaUpload,
  completeReplyMediaMultipartUpload,
  createReply,
  deletePost,
  deleteReply,
  initiateReplyMediaMultipartUpload,
  mine,
  mute,
  replies,
  replyThread,
  report,
  save,
  saved,
  saveReply,
  share,
  show,
  unmute,
  unsave,
  unsaveReply,
  updatePost,
  updateReply,
  uploadReplyMedia,
  uploadReplyMediaMultipartPart,
  vote,
} from "./use-cases/controller";
import {
  createReplyValidator,
  listValidator,
  repliesValidator,
  replyMediaMultipartAbortValidator,
  replyMediaMultipartCompleteValidator,
  replyMediaMultipartInitiateValidator,
  replyReportValidator,
  replySaveValidator,
  replyShareValidator,
  reportValidator,
  saveValidator,
  shareValidator,
  showValidator,
  updatePostValidator,
  updateReplyValidator,
  voteValidator,
} from "./validator";

const routes = Router();

const replyMediaMultipartChunkMiddleware = createMultipartChunkMiddleware({
  maxFileSizeMb: UPLOAD_LIMITS.postReply.multipartChunkMb,
});

routes.get("/mine", privateAuth, listValidator, mine);
routes.get("/saved", privateAuth, listValidator, saved);
routes.get("/:id/replies", repliesValidator, replies);
routes.get("/:id/replies/:replyId/thread", replySaveValidator, replyThread);
routes.post(
  "/:id/replies/media",
  privateAuth,
  showValidator,
  authorizeReplyMediaUpload,
  publicMulter({
    single: "media",
    allowed: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ],
    size: UPLOAD_LIMITS.postReply.simpleMb,
  }),
  uploadReplyMedia,
);
routes.post(
  "/:id/replies/media/multipart/initiate",
  privateAuth,
  replyMediaMultipartInitiateValidator,
  initiateReplyMediaMultipartUpload,
);
routes.post(
  "/:id/replies/media/multipart/part",
  privateAuth,
  showValidator,
  replyMediaMultipartChunkMiddleware,
  uploadReplyMediaMultipartPart,
);
routes.post(
  "/:id/replies/media/multipart/complete",
  privateAuth,
  replyMediaMultipartCompleteValidator,
  completeReplyMediaMultipartUpload,
);
routes.delete(
  "/:id/replies/media/multipart",
  privateAuth,
  replyMediaMultipartAbortValidator,
  abortReplyMediaMultipartUpload,
);
routes.post("/:id/replies", privateAuth, createReplyValidator, createReply);
routes.post("/:id/replies/:replyId/save", privateAuth, replySaveValidator, saveReply);
routes.delete("/:id/replies/:replyId/save", privateAuth, replySaveValidator, unsaveReply);
routes.post("/:id/replies/:replyId/share", replyShareValidator, share);
routes.post("/:id/replies/:replyId/report", privateAuth, replyReportValidator, report);
routes.put("/:id/replies/:replyId", privateAuth, updateReplyValidator, updateReply);
routes.delete("/:id/replies/:replyId", privateAuth, replySaveValidator, deleteReply);
routes.post("/:id/vote", privateAuth, voteValidator, vote);
routes.post("/:id/save", privateAuth, saveValidator, save);
routes.delete("/:id/save", privateAuth, saveValidator, unsave);
routes.post("/:id/share", shareValidator, share);
routes.post("/:id/mute", privateAuth, showValidator, mute);
routes.delete("/:id/mute", privateAuth, showValidator, unmute);
routes.post("/:id/report", privateAuth, reportValidator, report);
routes.put("/:id", privateAuth, updatePostValidator, updatePost);
routes.delete("/:id", privateAuth, showValidator, deletePost);
routes.get("/:id", showValidator, show);

export default routes;
