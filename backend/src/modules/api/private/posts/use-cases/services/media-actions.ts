import { error, msg } from "@/helpers/translate";
import { notifyPostShared, notifyPostVote } from "@/main/notification/domain-events";
import type {
  IPostReportDTO,
  IPostShareDTO,
  IPostUploadReplyMediaDTO,
  IPostVoteDTO,
} from "../../DTOs/IPostDTO";
import { PostRepository } from "../../repositories/PostRepository";

import {
  type AuthenticatedPostShowDTO,
  ensureCommunityActor,
  invalidReportReason,
  invalidVoteValue,
  mediaNotAllowed,
  mediaTypeFromMime,
  notFound,
  publicFileUrl,
  reportReasons,
  resolveMutationResult,
} from "./post-support";

export const authorizeReplyMediaUpload = async (data: AuthenticatedPostShowDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const [postExists, canAttach] = await Promise.all([
    repository.exists(data.p.id),
    repository.canAttachReplyMedia(data.auth.id!),
  ]);

  if (!postExists) return notFound();
  if (!canAttach) return mediaNotAllowed();

  return {
    status: 200,
    success: true,
  };
};

export const uploadReplyMedia = async (data: IPostUploadReplyMediaDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const [postExists, canAttach] = await Promise.all([
    repository.exists(data.p.id),
    repository.canAttachReplyMedia(data.auth.id!),
  ]);

  if (!postExists) return notFound();
  if (!canAttach) return mediaNotAllowed();

  const key = data.file?.path || data.file?.key;
  const mediaType = mediaTypeFromMime(data.file?.mimetype);

  if (!key?.startsWith("posts/media/") || !mediaType) {
    return {
      status: 400,
      ...error("upload_error", {}),
    };
  }

  return {
    status: 200,
    ...msg("post_reply_media_uploaded", {}),
    data: {
      media_type: mediaType,
      media_url: publicFileUrl(key),
    },
  };
};

export const report = async (data: IPostReportDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const reason = String(data.b.reason ?? "").trim();
  if (!reportReasons.has(reason)) return invalidReportReason();

  const repository = new PostRepository();
  const res = await repository.report({
    ...data,
    b: {
      description: data.b.description?.trim() || undefined,
      reason,
    },
  });

  return resolveMutationResult(res, 200, "post_report_created");
};

export const share = async (data: IPostShareDTO) => {
  const repository = new PostRepository();
  const res = await repository.share(data);

  if (res.kind !== "ok") return resolveMutationResult(res, 200, "post_shared");

  if (res.data.notification_event_id) {
    await notifyPostShared({
      actorId: data.auth?.id ?? null,
      postId: res.data.post_id,
      replyId: res.data.reply_id,
      shareId: res.data.notification_event_id,
    });
  }

  return {
    status: 200,
    ...msg("post_shared", {}),
    data: res.data,
  };
};

export const vote = async (data: IPostVoteDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  if (data.b.value !== 1 && data.b.value !== -1) {
    return invalidVoteValue();
  }

  const repository = new PostRepository();
  const res = await repository.vote({
    ...data,
    b: {
      value: data.b.value,
      replyId: data.b.replyId?.trim() || undefined,
    },
  });

  if (res.kind === "ok") {
    await notifyPostVote({
      actorId: data.auth.id!,
      postId: res.data.post_id,
      replyId: res.data.reply_id,
      value: res.data.value,
    });
  }

  return resolveMutationResult(res, 200, "post_vote_updated");
};
