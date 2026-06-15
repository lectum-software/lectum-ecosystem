import { Router } from "express";
import multer from "@/config/multer";
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
    size: 5,
  }),
  uploadAvatar,
);
routes.delete("/avatar", removeAvatar);

export default routes;
