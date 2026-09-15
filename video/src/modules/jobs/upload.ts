import type { RequestHandler } from "express";
import multer from "multer";
import type { VideoServiceConfig } from "../../config/env.js";
import { prepareVideoInput } from "../../infra/storage/storage.js";

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/octet-stream",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export const isAllowedVideoUploadMimeType = (value: string) =>
  ALLOWED_UPLOAD_MIME_TYPES.has(value.trim().toLowerCase().split(";", 1)[0] ?? "");

export const createVideoUploadMiddleware = (config: VideoServiceConfig): RequestHandler => {
  const storage = multer.diskStorage({
    destination: (request, _file, callback) => {
      const jobId = request.videoJobId;
      if (!jobId) {
        callback(new Error("video_job_id_missing"), "");
        return;
      }

      void prepareVideoInput(config, jobId).then(
        (paths) => callback(null, paths.incomingDirectory),
        (error: unknown) =>
          callback(error instanceof Error ? error : new Error("storage_error"), ""),
      );
    },
    filename: (_request, _file, callback) => callback(null, "source"),
  });

  return multer({
    fileFilter: (_request, file, callback) => {
      if (file.fieldname !== "video" || !isAllowedVideoUploadMimeType(file.mimetype)) {
        callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "video"));
        return;
      }
      callback(null, true);
    },
    limits: {
      fieldNameSize: 32,
      fieldSize: 1,
      fields: 0,
      fileSize: config.maxInputBytes,
      files: 1,
      // Busboy emits LIMIT_PART_COUNT when the configured threshold is reached; two permits the
      // single file part while `fields: 0` and `files: 1` still reject every additional part.
      parts: 2,
    },
    storage,
  }).single("video");
};
