import { Router } from "express";
import multer from "@/config/multer";
import { UPLOAD_LIMITS } from "@/config/multer/limits";
import { createMultipartChunkMiddleware } from "@/config/multer/multipart-chunk";
import { uploadConcurrencyMiddleware } from "@/config/multer/upload-concurrency";
import {
  abortProfileVideoMultipartUpload,
  completeProfileVideoMultipartUpload,
  initiateProfileVideoMultipartUpload,
  removeAvatar,
  removeCoverImage,
  removeVideo,
  show,
  update,
  uploadAvatar,
  uploadCoverImage,
  uploadProfileVideoMultipartPart,
  uploadVideo,
  uploadVideoCover,
} from "./use-cases/controller";
import {
  videoMultipartAbortValidator,
  videoMultipartCompleteValidator,
  videoMultipartInitiateValidator,
  videoMultipartPartValidator,
} from "./validator";

const routes = Router();
const videoMultipartChunkMiddleware = createMultipartChunkMiddleware({
  maxFileSizeMb: UPLOAD_LIMITS.psychologist.videoMultipartChunkMb,
  scope: "psychologist_profile_video",
});

routes.get("", show);
routes.put("", update);
routes.post(
  "/avatar",
  multer({
    single: "avatar",
    allowed: ["image/jpeg", "image/png", "image/webp"],
    size: UPLOAD_LIMITS.psychologist.avatarMb,
  }),
  uploadAvatar,
);
routes.delete("/avatar", removeAvatar);
routes.post(
  "/cover-image",
  multer({
    single: "cover-image",
    allowed: ["image/jpeg", "image/png", "image/webp"],
    size: UPLOAD_LIMITS.psychologist.coverImageMb,
  }),
  uploadCoverImage,
);
routes.delete("/cover-image", removeCoverImage);
routes.post(
  "/video/multipart/initiate",
  videoMultipartInitiateValidator,
  initiateProfileVideoMultipartUpload,
);
routes.post(
  "/video/multipart/part",
  uploadConcurrencyMiddleware,
  videoMultipartChunkMiddleware,
  videoMultipartPartValidator,
  uploadProfileVideoMultipartPart,
);
routes.post(
  "/video/multipart/complete",
  videoMultipartCompleteValidator,
  completeProfileVideoMultipartUpload,
);
routes.delete("/video/multipart", videoMultipartAbortValidator, abortProfileVideoMultipartUpload);
routes.post(
  "/video",
  multer({
    single: "video",
    allowed: ["video/mp4", "video/webm", "video/quicktime"],
    size: UPLOAD_LIMITS.psychologist.videoSimpleMb,
  }),
  uploadVideo,
);
routes.post(
  "/video/cover",
  multer({
    single: "video-cover",
    allowed: ["image/jpeg", "image/png", "image/webp"],
    size: UPLOAD_LIMITS.psychologist.videoCoverMb,
  }),
  uploadVideoCover,
);
routes.delete("/video", removeVideo);

export default routes;
