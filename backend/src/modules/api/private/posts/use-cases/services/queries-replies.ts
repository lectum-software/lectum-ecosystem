import { msg } from "@/helpers/translate";
import { notifyNewPostReply } from "@/main/notification/domain-events";
import { type ModerationResult, moderatePatientText } from "@/utils/content-moderation";
import {
  findModerationPostContext,
  recordContentModerationEvent,
} from "@/utils/content-moderation-events";
import type {
  IPostCreateReplyDTO,
  IPostMineDTO,
  IPostRepliesDTO,
  IPostReplyThreadDTO,
  IPostSavedDTO,
  IPostShowDTO,
} from "../../DTOs/IPostDTO";
import { PostRepository } from "../../repositories/PostRepository";

import {
  ensureCommunityActor,
  moderationError,
  notFound,
  resolveMutationResult,
} from "./post-support";

export const show = async (data: IPostShowDTO) => {
  const repository = new PostRepository();
  const res = await repository.show(data);

  if (!res) return notFound();

  return {
    status: 200,
    ...msg("show", {}),
    data: res,
  };
};

export const mine = async (data: IPostMineDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.mine(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const saved = async (data: IPostSavedDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.saved(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const replies = async (data: IPostRepliesDTO) => {
  const repository = new PostRepository();
  const res = await repository.replies(data);

  if (!res) return notFound();

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const replyThread = async (data: IPostReplyThreadDTO) => {
  const repository = new PostRepository();
  const res = await repository.replyThread(data);

  if (!res) return notFound();

  return {
    status: 200,
    ...msg("show", {}),
    data: res,
  };
};

export const createReply = async (data: IPostCreateReplyDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const content = String(data.b.content ?? "").trim();
  let moderation: ModerationResult | null = null;
  let moderationPost: Awaited<ReturnType<typeof findModerationPostContext>> | null = null;

  if (data.auth.role === "paciente") {
    moderationPost = await findModerationPostContext(data.p.id);
    if (!moderationPost) return notFound();

    moderation = moderatePatientText({
      authorRole: data.auth.role,
      content,
      targetType: "reply",
    });

    if (moderation.decision === "block" || moderation.decision === "safety_hold") {
      await recordContentModerationEvent({
        authorId: data.auth.id!,
        communityId: moderationPost.community_id,
        content,
        result: moderation,
        targetType: "submitted_reply",
        title: moderationPost.title,
      });

      return moderationError(moderation);
    }
  }

  const res = await repository.createReply({
    ...data,
    b: {
      content,
      mediaType: data.b.mediaType,
      mediaUrl: data.b.mediaUrl?.trim() || undefined,
      parentReplyId: data.b.parentReplyId?.trim() || undefined,
      thumbnailUrl: data.b.thumbnailUrl?.trim() || undefined,
    },
  });

  if (res.kind === "ok") {
    if (moderation?.decision === "allow_sensitive") {
      await recordContentModerationEvent({
        authorId: data.auth.id!,
        communityId: moderationPost?.community_id ?? null,
        content,
        result: moderation,
        targetId: res.data.id,
        targetType: "post_reply",
        title: moderationPost?.title ?? null,
      });
    }

    await notifyNewPostReply({
      actorId: data.auth.id!,
      parentReplyId: res.data.parent_reply_id,
      postId: data.p.id,
      replyId: res.data.id,
    });
  }

  return resolveMutationResult(res, 201, "post_reply_created");
};
