import { msg } from "@/helpers/translate";
import { notifyPostSaved } from "@/main/notification/domain-events";
import type {
  IPostDeleteDTO,
  IPostMuteDTO,
  IPostReplyDeleteDTO,
  IPostReplySaveDTO,
  IPostSaveDTO,
} from "../../DTOs/IPostDTO";
import { PostRepository } from "../../repositories/PostRepository";

import {
  ensureCommunityActor,
  resolveMutationResult,
  resolveOwnerPostMutationResult,
} from "./post-support";

export const save = async (data: IPostSaveDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.save(data);

  if (res.kind !== "ok") return resolveMutationResult(res, 200, "post_saved");

  const { notification_event_id: notificationEventId, ...response } = res.data;

  if (notificationEventId) {
    await notifyPostSaved({
      actorId: data.auth.id!,
      postId: response.post_id,
      saveId: notificationEventId,
    });
  }

  return {
    status: 200,
    ...msg("post_saved", {}),
    data: response,
  };
};

export const unsave = async (data: IPostSaveDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.unsave(data);

  return resolveMutationResult(res, 200, "post_unsaved");
};

export const mute = async (data: IPostMuteDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.mute(data);

  return resolveOwnerPostMutationResult(res, 200, "post_muted");
};

export const unmute = async (data: IPostMuteDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.unmute(data);

  return resolveOwnerPostMutationResult(res, 200, "post_unmuted");
};

export const deletePost = async (data: IPostDeleteDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.deletePost(data);

  return resolveOwnerPostMutationResult(res, 200, "post_deleted");
};

export const saveReply = async (data: IPostReplySaveDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.saveReply(data);

  return resolveMutationResult(res, 200, "post_reply_saved");
};

export const unsaveReply = async (data: IPostReplySaveDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.unsaveReply(data);

  return resolveMutationResult(res, 200, "post_reply_unsaved");
};

export const deleteReply = async (data: IPostReplyDeleteDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.deleteReply(data);

  return resolveMutationResult(res, 200, "post_reply_deleted");
};
