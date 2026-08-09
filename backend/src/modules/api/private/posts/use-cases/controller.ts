import type { NextFunction, Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  authorizeReplyMediaUpload as authorizeReplyMediaUploadService,
  createReply as createReplyService,
  deletePost as deletePostService,
  deleteReply as deleteReplyService,
  mine as mineService,
  mute as muteService,
  replies as repliesService,
  replyThread as replyThreadService,
  report as reportService,
  saved as savedService,
  saveReply as saveReplyService,
  save as saveService,
  share as shareService,
  show as showService,
  unmute as unmuteService,
  unsaveReply as unsaveReplyService,
  unsave as unsaveService,
  updatePost as updatePostService,
  updateReply as updateReplyService,
  uploadReplyMedia as uploadReplyMediaService,
  vote as voteService,
} from "./services";

export const mine = async (req: Request, res: Response) => {
  try {
    const resolve = await mineService(req as unknown as Parameters<typeof mineService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_mine", err);
  }
};

export const saved = async (req: Request, res: Response) => {
  try {
    const resolve = await savedService(req as unknown as Parameters<typeof savedService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_saved_list", err);
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showService(req as unknown as Parameters<typeof showService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_show", err);
  }
};

export const replies = async (req: Request, res: Response) => {
  try {
    const resolve = await repliesService(req as unknown as Parameters<typeof repliesService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_replies", err);
  }
};

export const replyThread = async (req: Request, res: Response) => {
  try {
    const resolve = await replyThreadService(
      req as unknown as Parameters<typeof replyThreadService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_reply_thread", err);
  }
};

export const createReply = async (req: Request, res: Response) => {
  try {
    const resolve = await createReplyService(
      req as unknown as Parameters<typeof createReplyService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_create_reply", err);
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    const resolve = await updatePostService(
      req as unknown as Parameters<typeof updatePostService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_update", err);
  }
};

export const updateReply = async (req: Request, res: Response) => {
  try {
    const resolve = await updateReplyService(
      req as unknown as Parameters<typeof updateReplyService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_reply_update", err);
  }
};

export const authorizeReplyMediaUpload = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const resolve = await authorizeReplyMediaUploadService(
      req as unknown as Parameters<typeof authorizeReplyMediaUploadService>[0],
    );

    if (!resolve.success) {
      return send(res, resolve);
    }

    return next();
  } catch (err) {
    return error500(res, "post_reply_media_authorize", err);
  }
};

export const uploadReplyMedia = async (req: Request, res: Response) => {
  try {
    const file = req.file as (Express.Multer.File & { key?: string; path?: string }) | undefined;
    const resolve = await uploadReplyMediaService({
      auth: req.auth,
      file,
      p: req.params as unknown as Parameters<typeof uploadReplyMediaService>[0]["p"],
    });

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_reply_media_upload", err);
  }
};

export const report = async (req: Request, res: Response) => {
  try {
    const resolve = await reportService(req as unknown as Parameters<typeof reportService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_report", err);
  }
};

export const share = async (req: Request, res: Response) => {
  try {
    const resolve = await shareService(req as unknown as Parameters<typeof shareService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_share", err);
  }
};

export const vote = async (req: Request, res: Response) => {
  try {
    const resolve = await voteService(req as unknown as Parameters<typeof voteService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_vote", err);
  }
};

export const save = async (req: Request, res: Response) => {
  try {
    const resolve = await saveService(req as unknown as Parameters<typeof saveService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_save", err);
  }
};

export const unsave = async (req: Request, res: Response) => {
  try {
    const resolve = await unsaveService(req as unknown as Parameters<typeof unsaveService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_unsave", err);
  }
};

export const mute = async (req: Request, res: Response) => {
  try {
    const resolve = await muteService(req as unknown as Parameters<typeof muteService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_mute", err);
  }
};

export const unmute = async (req: Request, res: Response) => {
  try {
    const resolve = await unmuteService(req as unknown as Parameters<typeof unmuteService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_unmute", err);
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const resolve = await deletePostService(
      req as unknown as Parameters<typeof deletePostService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_delete", err);
  }
};

export const saveReply = async (req: Request, res: Response) => {
  try {
    const resolve = await saveReplyService(
      req as unknown as Parameters<typeof saveReplyService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_reply_save", err);
  }
};

export const unsaveReply = async (req: Request, res: Response) => {
  try {
    const resolve = await unsaveReplyService(
      req as unknown as Parameters<typeof unsaveReplyService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_reply_unsave", err);
  }
};

export const deleteReply = async (req: Request, res: Response) => {
  try {
    const resolve = await deleteReplyService(
      req as unknown as Parameters<typeof deleteReplyService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_reply_delete", err);
  }
};
