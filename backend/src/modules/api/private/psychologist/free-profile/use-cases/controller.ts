import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  removeAvatar as removeAvatarService,
  removeVideo as removeVideoService,
  show as showService,
  update as updateService,
  uploadAvatar as uploadAvatarService,
  uploadVideoCover as uploadVideoCoverService,
  uploadVideo as uploadVideoService,
} from "./services";

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showService(req as unknown as Parameters<typeof showService>[0]);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_free_profile_show", err);
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const resolve = await updateService({
      auth: req.auth,
      b: req.body,
    });
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_free_profile_update", err);
  }
};

export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const file = req.file as
      | (Express.Multer.File & { path?: string; key?: string; fileUrl?: string })
      | undefined;
    const resolve = await uploadAvatarService({
      auth: req.auth,
      file,
    });
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_free_profile_upload_avatar", err);
  }
};

export const removeAvatar = async (req: Request, res: Response) => {
  try {
    const resolve = await removeAvatarService({
      auth: req.auth,
    });
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_free_profile_remove_avatar", err);
  }
};

export const uploadVideo = async (req: Request, res: Response) => {
  try {
    const file = req.file as
      | (Express.Multer.File & { path?: string; key?: string; fileUrl?: string })
      | undefined;
    const resolve = await uploadVideoService({
      auth: req.auth,
      file,
    });
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_free_profile_upload_video", err);
  }
};

export const uploadVideoCover = async (req: Request, res: Response) => {
  try {
    const file = req.file as
      | (Express.Multer.File & { path?: string; key?: string; fileUrl?: string })
      | undefined;
    const resolve = await uploadVideoCoverService({
      auth: req.auth,
      file,
    });
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_free_profile_upload_video_cover", err);
  }
};

export const removeVideo = async (req: Request, res: Response) => {
  try {
    const resolve = await removeVideoService({
      auth: req.auth,
    });
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_free_profile_remove_video", err);
  }
};
