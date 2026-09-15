import type { NextFunction, Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  authorizePostMediaUpload as authorizePostMediaUploadService,
  createPost as createPostService,
  feed as feedService,
  follow as followService,
  index as indexService,
  posts as postsService,
  show as showService,
  suggest as suggestService,
  topMentors as topMentorsService,
  unfollow as unfollowService,
  uploadPostMedia as uploadPostMediaService,
} from "./services";
import {
  abortPostMediaMultipartUpload as abortPostMediaMultipartUploadService,
  completePostMediaMultipartUpload as completePostMediaMultipartUploadService,
  initiatePostMediaMultipartUpload as initiatePostMediaMultipartUploadService,
  uploadPostMediaMultipartPart as uploadPostMediaMultipartPartService,
} from "./services/post-media-multipart";

export const index = async (req: Request, res: Response) => {
  try {
    const resolve = await indexService(req as unknown as Parameters<typeof indexService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_index", err);
  }
};

export const suggest = async (req: Request, res: Response) => {
  try {
    const resolve = await suggestService(req as unknown as Parameters<typeof suggestService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_suggest", err);
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showService(req as unknown as Parameters<typeof showService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_show", err);
  }
};

export const feed = async (req: Request, res: Response) => {
  try {
    const resolve = await feedService(req as unknown as Parameters<typeof feedService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_feed", err);
  }
};

export const topMentors = async (req: Request, res: Response) => {
  try {
    const resolve = await topMentorsService(
      req as unknown as Parameters<typeof topMentorsService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_top_mentors", err);
  }
};

export const follow = async (req: Request, res: Response) => {
  try {
    const resolve = await followService(req as unknown as Parameters<typeof followService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_follow", err);
  }
};

export const unfollow = async (req: Request, res: Response) => {
  try {
    const resolve = await unfollowService(req as unknown as Parameters<typeof unfollowService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_unfollow", err);
  }
};

export const posts = async (req: Request, res: Response) => {
  try {
    const resolve = await postsService(req as unknown as Parameters<typeof postsService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_posts", err);
  }
};

export const createPost = async (req: Request, res: Response) => {
  try {
    const resolve = await createPostService(
      req as unknown as Parameters<typeof createPostService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_create_post", err);
  }
};

export const authorizePostMediaUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resolve = await authorizePostMediaUploadService(
      req as unknown as Parameters<typeof authorizePostMediaUploadService>[0],
    );

    if (resolve.status && resolve.status >= 400) return send(res, resolve);

    return next();
  } catch (err) {
    return error500(res, "community_authorize_post_media_upload", err);
  }
};

export const uploadPostMedia = async (req: Request, res: Response) => {
  try {
    const resolve = await uploadPostMediaService(
      req as unknown as Parameters<typeof uploadPostMediaService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_upload_post_media", err);
  }
};

export const initiatePostMediaMultipartUpload = async (req: Request, res: Response) => {
  try {
    const resolve = await initiatePostMediaMultipartUploadService(
      req as unknown as Parameters<typeof initiatePostMediaMultipartUploadService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_post_media_multipart_initiate", err);
  }
};

export const uploadPostMediaMultipartPart = async (req: Request, res: Response) => {
  try {
    const resolve = await uploadPostMediaMultipartPartService({
      auth: req.auth,
      b: req.b as Parameters<typeof uploadPostMediaMultipartPartService>[0]["b"],
      file: req.file,
      p: req.p as Parameters<typeof uploadPostMediaMultipartPartService>[0]["p"],
    });

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_post_media_multipart_part", err);
  }
};

export const completePostMediaMultipartUpload = async (req: Request, res: Response) => {
  try {
    const resolve = await completePostMediaMultipartUploadService(
      req as unknown as Parameters<typeof completePostMediaMultipartUploadService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_post_media_multipart_complete", err);
  }
};

export const abortPostMediaMultipartUpload = async (req: Request, res: Response) => {
  try {
    const resolve = await abortPostMediaMultipartUploadService(
      req as unknown as Parameters<typeof abortPostMediaMultipartUploadService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_post_media_multipart_abort", err);
  }
};
