import { Router } from "express";
import multer from "@/config/multer";
import {
  removeAvatar,
  removeCoverImage,
  removeVideo,
  show,
  update,
  uploadAvatar,
  uploadCoverImage,
  uploadVideo,
  uploadVideoCover,
} from "./use-cases/controller";

const routes = Router();

routes.get("", show);
routes.put("", update);
routes.post(
  "/avatar",
  multer({
    single: "avatar",
    allowed: ["image/jpeg", "image/png", "image/webp"],
    size: 5,
  }),
  uploadAvatar,
);
routes.delete("/avatar", removeAvatar);
routes.post(
  "/cover-image",
  multer({
    single: "cover-image",
    allowed: ["image/jpeg", "image/png", "image/webp"],
    size: 5,
  }),
  uploadCoverImage,
);
routes.delete("/cover-image", removeCoverImage);
routes.post(
  "/video",
  multer({
    single: "video",
    allowed: ["video/mp4", "video/webm", "video/quicktime"],
    size: 50,
  }),
  uploadVideo,
);
routes.post(
  "/video/cover",
  multer({
    single: "video-cover",
    allowed: ["image/jpeg", "image/png", "image/webp"],
    size: 5,
  }),
  uploadVideoCover,
);
routes.delete("/video", removeVideo);

export default routes;
