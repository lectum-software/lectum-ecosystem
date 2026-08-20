import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { resolve } from "@/helpers/translate/resolve";

type MultipartChunkMiddlewareOptions = {
  fieldName?: string;
  maxFileSizeMb: number;
  maxTextFields?: number;
};

export const createMultipartChunkMiddleware = ({
  fieldName = "chunk",
  maxFileSizeMb,
  maxTextFields = 2,
}: MultipartChunkMiddlewareOptions) => {
  const upload = multer({
    limits: {
      fieldNameSize: 100,
      fieldSize: 4096,
      fields: maxTextFields,
      files: 1,
      fileSize: maxFileSizeMb * 1024 * 1024,
      parts: maxTextFields + 1,
    },
    storage: multer.memoryStorage(),
  }).single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (uploadError: unknown) => {
      if (uploadError) {
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
};
