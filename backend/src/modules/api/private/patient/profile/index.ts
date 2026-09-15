import { Router } from "express";
import multer from "@/config/multer";
import { UPLOAD_LIMITS } from "@/config/multer/limits";
import { removeAvatar, show, update, uploadAvatar } from "./use-cases/controller";
import validator from "./validator";

const routes = Router();

routes.get("", show);
routes.put("", validator, update);
routes.post(
  "/avatar",
  multer({
    single: "avatar",
    allowed: ["image/jpeg", "image/png", "image/webp"],
    size: UPLOAD_LIMITS.patient.avatarMb,
  }),
  uploadAvatar,
);
routes.delete("/avatar", removeAvatar);

export default routes;
