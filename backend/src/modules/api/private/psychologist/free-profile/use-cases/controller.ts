import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  abortProfileVideoMultipartUpload as abortProfileVideoMultipartUploadService,
  completeProfileVideoMultipartUpload as completeProfileVideoMultipartUploadService,
  initiateProfileVideoMultipartUpload as initiateProfileVideoMultipartUploadService,
  removeAvatar as removeAvatarService,
  removeCoverImage as removeCoverImageService,
  removeVideo as removeVideoService,
  show as showService,
  update as updateService,
  uploadAvatar as uploadAvatarService,
  uploadCoverImage as uploadCoverImageService,
  uploadProfileVideoMultipartPart as uploadProfileVideoMultipartPartService,
  uploadVideoCover as uploadVideoCoverService,
  uploadVideo as uploadVideoService,
} from "./services";

export const initiateProfileVideoMultipartUpload = async (req: Request, res: Response) => {
  try {
    const resolve = await initiateProfileVideoMultipartUploadService(
      req as unknown as Parameters<typeof initiateProfileVideoMultipartUploadService>[0],
    );
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_profile_video_multipart_initiate", err);
  }
};

export const uploadProfileVideoMultipartPart = async (req: Request, res: Response) => {
  try {
    const resolve = await uploadProfileVideoMultipartPartService({
      auth: req.auth,
      b: req.body as Parameters<typeof uploadProfileVideoMultipartPartService>[0]["b"],
      file: req.file,
    });
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_profile_video_multipart_part", err);
  }
};

export const completeProfileVideoMultipartUpload = async (req: Request, res: Response) => {
  try {
    const resolve = await completeProfileVideoMultipartUploadService(
      req as unknown as Parameters<typeof completeProfileVideoMultipartUploadService>[0],
    );
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_profile_video_multipart_complete", err);
  }
};

export const abortProfileVideoMultipartUpload = async (req: Request, res: Response) => {
  try {
    const resolve = await abortProfileVideoMultipartUploadService(
      req as unknown as Parameters<typeof abortProfileVideoMultipartUploadService>[0],
    );
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_profile_video_multipart_abort", err);
  }
};

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

export const uploadCoverImage = async (req: Request, res: Response) => {
  try {
    const file = req.file as
      | (Express.Multer.File & { path?: string; key?: string; fileUrl?: string })
      | undefined;
    const resolve = await uploadCoverImageService({
      auth: req.auth,
      file,
    });
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_free_profile_upload_cover_image", err);
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

export const removeCoverImage = async (req: Request, res: Response) => {
  try {
    const resolve = await removeCoverImageService({
      auth: req.auth,
    });
    return send(res, resolve);
  } catch (err) {
    return error500(res, "psychologist_free_profile_remove_cover_image", err);
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
