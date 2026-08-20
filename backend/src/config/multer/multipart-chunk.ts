import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { resolve } from "@/helpers/translate/resolve";
import { toMulterExclusiveThreshold } from "./limits";
import { logMultipartUpload, type MultipartUploadLogReason } from "./multipart-logging";

type MultipartChunkMiddlewareOptions = {
  fieldName?: string;
  maxFileSizeMb: number;
  maxTextFields?: number;
  scope?: string;
};

const multerReasonByCode: Partial<Record<multer.MulterError["code"], MultipartUploadLogReason>> = {
  LIMIT_FIELD_COUNT: "field_count",
  LIMIT_FIELD_KEY: "field_name",
  LIMIT_FIELD_VALUE: "field_size",
  LIMIT_FILE_COUNT: "file_count",
  LIMIT_FILE_SIZE: "file_size",
  LIMIT_PART_COUNT: "part_count",
  LIMIT_UNEXPECTED_FILE: "unexpected_file",
};

const resolveParseFailureReason = (uploadError: unknown): MultipartUploadLogReason =>
  uploadError instanceof multer.MulterError
    ? multerReasonByCode[uploadError.code] || "parse"
    : "parse";

export const createMultipartChunkMiddleware = ({
  fieldName = "chunk",
  maxFileSizeMb,
  maxTextFields = 2,
  scope = "multipart_upload",
}: MultipartChunkMiddlewareOptions) => {
  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
  const upload = multer({
    limits: {
      fieldNameSize: 100,
      fieldSize: toMulterExclusiveThreshold(4096),
      fields: maxTextFields,
      files: 1,
      fileSize: toMulterExclusiveThreshold(maxFileSizeBytes),
      parts: toMulterExclusiveThreshold(maxTextFields + 1),
    },
    storage: multer.memoryStorage(),
  }).single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (uploadError: unknown) => {
      if (uploadError) {
        logMultipartUpload("PARSE_REJECTED", {
          expectedBytes: maxFileSizeBytes,
          reason: resolveParseFailureReason(uploadError),
          scope,
        });

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
