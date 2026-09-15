import type { Request } from "express";
import type multer from "multer";
import { resolve } from "@/helpers/translate/resolve";
import { UploadInfrastructureError, UploadValidationError } from "./errors";
import { isPublicImageMimeType } from "./public-image-policy";

export function fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!isPublicImageMimeType(file.mimetype)) {
    return cb(new UploadValidationError("Envie uma imagem JPG, PNG ou WebP.", file.fieldname));
  }
  const allowed = req.allowed;
  if (!allowed?.length) {
    return cb(new UploadInfrastructureError("UPLOAD_ALLOWED_TYPES_NOT_CONFIGURED"));
  }
  const fileMime = file.mimetype;
  const isValid = allowed.some((allowedType) => {
    if (allowedType === fileMime) return true;
    if (allowedType.endsWith("/*")) {
      const allowedPrefix = allowedType.split("/")[0];
      const filePrefix = fileMime.split("/")[0];
      return allowedPrefix === filePrefix;
    }
    return false;
  });
  if (!isValid) {
    const ext = fileMime.split("/")[1];
    const errorMessage = resolve("error.unexpected_type_file", {
      type: ext?.toUpperCase(),
    });
    const error = new UploadValidationError(errorMessage, file.fieldname);
    return cb(error);
  }
  cb(null, true);
}
