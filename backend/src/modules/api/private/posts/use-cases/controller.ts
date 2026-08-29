import type { NextFunction, Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  abortReplyMediaMultipartUpload as abortReplyMediaMultipartUploadService,
  authorizeReplyMediaUpload as authorizeReplyMediaUploadService,
  completeReplyMediaMultipartUpload as completeReplyMediaMultipartUploadService,
  createReply as createReplyService,
  deletePost as deletePostService,
  deleteReply as deleteReplyService,
  getRenderShareArtifactJobFile as getRenderShareArtifactJobFileService,
  getRenderShareArtifactJob as getRenderShareArtifactJobService,
  getShareArtifact as getShareArtifactService,
  initiateReplyMediaMultipartUpload as initiateReplyMediaMultipartUploadService,
  mine as mineService,
  mute as muteService,
  renderShareArtifact as renderShareArtifactService,
  replies as repliesService,
  replyThread as replyThreadService,
  report as reportService,
  saved as savedService,
  saveReply as saveReplyService,
  save as saveService,
  share as shareService,
  show as showService,
  startRenderShareArtifactJob as startRenderShareArtifactJobService,
  unmute as unmuteService,
  unsaveReply as unsaveReplyService,
  unsave as unsaveService,
  updatePost as updatePostService,
  updateReply as updateReplyService,
  uploadReplyMediaMultipartPart as uploadReplyMediaMultipartPartService,
  uploadReplyMedia as uploadReplyMediaService,
  uploadShareArtifact as uploadShareArtifactService,
  vote as voteService,
} from "./services";

type ShareArtifactRenderResponseData = {
  buffer: Buffer;
  contentType: string;
  fileName: string;
  sizeBytes: number;
};

const isShareArtifactRenderResponseData = (
  value: unknown,
): value is ShareArtifactRenderResponseData =>
  Boolean(
    value &&
      typeof value === "object" &&
      Buffer.isBuffer((value as ShareArtifactRenderResponseData).buffer) &&
      typeof (value as ShareArtifactRenderResponseData).contentType === "string" &&
      typeof (value as ShareArtifactRenderResponseData).fileName === "string" &&
      typeof (value as ShareArtifactRenderResponseData).sizeBytes === "number",
  );

const contentDispositionForFileName = (fileName: string) => {
  const fallback =
    fileName
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/["\\]/g, "_")
      .trim() || "lectum-video.mp4";

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

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

export const initiateReplyMediaMultipartUpload = async (req: Request, res: Response) => {
  try {
    const resolve = await initiateReplyMediaMultipartUploadService(
      req as unknown as Parameters<typeof initiateReplyMediaMultipartUploadService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_reply_media_multipart_initiate", err);
  }
};

export const uploadReplyMediaMultipartPart = async (req: Request, res: Response) => {
  try {
    const resolve = await uploadReplyMediaMultipartPartService({
      auth: req.auth,
      b: req.body as Parameters<typeof uploadReplyMediaMultipartPartService>[0]["b"],
      file: req.file,
      p: req.params as unknown as Parameters<typeof uploadReplyMediaMultipartPartService>[0]["p"],
    });

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_reply_media_multipart_part", err);
  }
};

export const completeReplyMediaMultipartUpload = async (req: Request, res: Response) => {
  try {
    const resolve = await completeReplyMediaMultipartUploadService(
      req as unknown as Parameters<typeof completeReplyMediaMultipartUploadService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_reply_media_multipart_complete", err);
  }
};

export const abortReplyMediaMultipartUpload = async (req: Request, res: Response) => {
  try {
    const resolve = await abortReplyMediaMultipartUploadService(
      req as unknown as Parameters<typeof abortReplyMediaMultipartUploadService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_reply_media_multipart_abort", err);
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

export const getShareArtifact = async (req: Request, res: Response) => {
  try {
    const resolve = await getShareArtifactService(
      req as unknown as Parameters<typeof getShareArtifactService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_share_artifact", err);
  }
};

export const uploadShareArtifact = async (req: Request, res: Response) => {
  try {
    const file = req.file as (Express.Multer.File & { key?: string; path?: string }) | undefined;
    const resolve = await uploadShareArtifactService({
      auth: req.auth,
      file,
      p: req.params as unknown as Parameters<typeof uploadShareArtifactService>[0]["p"],
    });

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_share_artifact_upload", err);
  }
};

export const renderShareArtifact = async (req: Request, res: Response) => {
  try {
    const resolve = await renderShareArtifactService({
      auth: req.auth,
      p: req.params as unknown as Parameters<typeof renderShareArtifactService>[0]["p"],
    });

    if (resolve.success && isShareArtifactRenderResponseData(resolve.data)) {
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Disposition", contentDispositionForFileName(resolve.data.fileName));
      res.setHeader("Content-Length", String(resolve.data.sizeBytes));
      res.setHeader("Content-Type", resolve.data.contentType);
      res.setHeader("X-Content-Type-Options", "nosniff");

      return res.status(200).send(resolve.data.buffer);
    }

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_share_artifact_render", err);
  }
};

export const startRenderShareArtifactJob = async (req: Request, res: Response) => {
  try {
    const resolve = await startRenderShareArtifactJobService({
      auth: req.auth,
      p: req.params as unknown as Parameters<typeof startRenderShareArtifactJobService>[0]["p"],
    });

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_share_artifact_render_job_start", err);
  }
};

export const getRenderShareArtifactJob = async (req: Request, res: Response) => {
  try {
    const resolve = await getRenderShareArtifactJobService({
      auth: req.auth,
      p: req.params as unknown as Parameters<typeof getRenderShareArtifactJobService>[0]["p"],
    });

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_share_artifact_render_job", err);
  }
};

export const getRenderShareArtifactJobFile = async (req: Request, res: Response) => {
  try {
    const resolve = await getRenderShareArtifactJobFileService({
      auth: req.auth,
      p: req.params as unknown as Parameters<typeof getRenderShareArtifactJobFileService>[0]["p"],
    });

    if (resolve.success && isShareArtifactRenderResponseData(resolve.data)) {
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Disposition", contentDispositionForFileName(resolve.data.fileName));
      res.setHeader("Content-Length", String(resolve.data.sizeBytes));
      res.setHeader("Content-Type", resolve.data.contentType);
      res.setHeader("X-Content-Type-Options", "nosniff");

      return res.status(200).send(resolve.data.buffer);
    }

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_share_artifact_render_job_file", err);
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
