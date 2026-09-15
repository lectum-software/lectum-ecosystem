import { Router } from "express";
import multer from "@/config/multer";
import { UPLOAD_LIMITS } from "@/config/multer/limits";
import { authorizeUploadImage, index, update, uploadImage } from "./use-cases/controller";
import { indexValidator, updateValidator, uploadImageValidator } from "./validator";

const routes = Router();

routes.get("/", indexValidator, index);
routes.post(
  "/:page_key/og-image",
  uploadImageValidator,
  authorizeUploadImage,
  multer({
    single: "og-image",
    feature: "seo",
    allowed: ["image/jpeg", "image/png", "image/webp"],
    size: UPLOAD_LIMITS.admin.seoOgImageMb,
  }),
  uploadImage,
);
routes.put("/:page_key", updateValidator, update);

export default routes;
