import { Router } from "express";
import multer from "@/config/multer";
import adminAuth from "../../../middlewares/_auth";
import { authorizeUploadImage, index, update, uploadImage } from "./use-cases/controller";
import { indexValidator, updateValidator, uploadImageValidator } from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/", indexValidator, index);
routes.post(
  "/:page_key/og-image",
  uploadImageValidator,
  authorizeUploadImage,
  multer({
    single: "og-image",
    feature: "seo",
    allowed: ["image/jpeg", "image/png", "image/webp"],
    size: 5,
  }),
  uploadImage,
);
routes.put("/:page_key", updateValidator, update);

export default routes;
