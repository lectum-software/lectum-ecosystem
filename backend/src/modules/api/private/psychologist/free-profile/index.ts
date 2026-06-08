import { Router } from "express";
import multer from "@/config/multer";
import {
  removeAvatar,
  removeVideo,
  show,
  update,
  uploadAvatar,
  uploadVideo,
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
  "/video",
  multer({
    single: "video",
    allowed: ["video/mp4", "video/webm", "video/quicktime"],
    size: 50,
  }),
  uploadVideo,
);
routes.delete("/video", removeVideo);

export default routes;
