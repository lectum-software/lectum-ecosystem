import type { NextFunction, Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  authorizeReplyMediaUpload as authorizeReplyMediaUploadService,
  createReply as createReplyService,
  deleteReply as deleteReplyService,
  mine as mineService,
  replies as repliesService,
  replyThread as replyThreadService,
  report as reportService,
  saved as savedService,
  saveReply as saveReplyService,
  save as saveService,
  show as showService,
  unsaveReply as unsaveReplyService,
  unsave as unsaveService,
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
