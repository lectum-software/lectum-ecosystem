import type { Request } from "express";
import type multer from "multer";
import { resolve } from "@/helpers/translate/resolve";

export function fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const allowed: string[] = (req as any).allowed;
  if (!allowed?.length) return cb(null, true);
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
    const error = new Error(errorMessage);
    return cb(error);
  }
  cb(null, true);
}
