import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  cancelUpload as cancelUploadService,
  createUpload,
  destroy as destroyService,
  showStatus,
} from "./services";

export const store = async (req: Request, res: Response) => {
  try {
    return send(res, await createUpload(req as unknown as Parameters<typeof createUpload>[0]));
  } catch (err) {
    return error500(res, "video_asset_upload_store", err);
  }
};

export const status = async (req: Request, res: Response) => {
  try {
    return send(res, await showStatus(req as unknown as Parameters<typeof showStatus>[0]));
  } catch (err) {
    return error500(res, "video_asset_status_show", err);
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    return send(res, await destroyService(req as unknown as Parameters<typeof destroyService>[0]));
  } catch (err) {
    return error500(res, "video_asset_destroy", err);
  }
};

export const cancelUpload = async (req: Request, res: Response) => {
  try {
    return send(
      res,
      await cancelUploadService(req as unknown as Parameters<typeof cancelUploadService>[0]),
    );
  } catch (err) {
    return error500(res, "video_asset_upload_cancel", err);
  }
};
