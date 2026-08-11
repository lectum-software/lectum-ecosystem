import { type NextFunction, type Request, type Response, Router } from "express";
import multerPackage from "multer";
import publicMulter from "@/config/multer";
import { resolve } from "@/helpers/translate/resolve";
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
import { POST_REPLY_MEDIA_MULTIPART_CHUNK_LIMIT_MB } from "./use-cases/services/reply-media-multipart";
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

const POST_REPLY_MEDIA_UPLOAD_LIMIT_MB = 200;
const replyMediaMultipartChunkUpload = multerPackage({
  limits: {
    fieldNameSize: 100,
    fieldSize: 4096,
    fields: 2,
    files: 1,
    fileSize: POST_REPLY_MEDIA_MULTIPART_CHUNK_LIMIT_MB * 1024 * 1024,
    parts: 3,
  },
  storage: multerPackage.memoryStorage(),
}).single("chunk");

const replyMediaMultipartChunkMiddleware = (req: Request, res: Response, next: NextFunction) => {
  replyMediaMultipartChunkUpload(req, res, (err: unknown) => {
    if (err instanceof multerPackage.MulterError) {
      return res.status(400).json({
        code: "upload_error",
        status: 400,
        success: false,
        error: resolve("error.upload_error"),
      });
    }

    if (err) {
      return res.status(400).json({
        code: "upload_error",
        status: 400,
        success: false,
        error: resolve("error.upload_error"),
      });
    }

    return next();
  });
};

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
    size: POST_REPLY_MEDIA_UPLOAD_LIMIT_MB,
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
