import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { resolve } from "@/helpers/translate/resolve";
import { fileFilter } from "./fileFilter";
import { storage } from "./storage";
import type { Option } from "./types";

export default (mode: Option) => (req: Request, res: Response, next: NextFunction) => {
  req.allowed = mode.allowed || [];
  req.public = mode.public || false;
  (req as Request & { uploadFeature?: string }).uploadFeature = mode.feature;
  let middleware: any;
  const max = mode.size ? mode.size * 1024 * 1024 : undefined;
  const config = multer({
    storage,
    fileFilter,
    limits: { fileSize: max },
  });
  try {
    if ("fields" in mode && mode.fields) {
      middleware = config.fields(mode.fields);
    } else if ("array" in mode && mode.array) {
      middleware = config.array(mode.array);
    } else if ("single" in mode && mode.single) {
      middleware = config.single(mode.single);
    } else {
      throw new Error(resolve("error.upload_config_error"));
    }
    middleware(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        let error = err.message;
        if (err.code === "LIMIT_UNEXPECTED_FILE") error = resolve("error.unexpected_field");
        if (err.code === "LIMIT_FILE_SIZE")
          error = resolve("error.exceeded_file_limit", { limit: mode.size });
        const name = err.field || "archive";
        next(error || err);
        return res.status(400).json({
          code: 400,
          status: 400,
          success: false,
          error: error || resolve("error.upload_error"),
          errors: { body: { [name]: error } },
        });
      } else if (err) {
        const name = err.field || "archive";
        next(err?.message || err);
        return res.status(400).json({
          code: 400,
          status: 400,
          success: false,
          error: err?.message || resolve("error.upload_error"),
          errors: { body: { [name]: err?.message } },
        });
      }
      next();
    });
  } catch (_error) {
    return res.status(500).json({
      code: 500,
      error: resolve("error.upload_config_error"),
      status: 500,
      success: false,
    });
  }
};
