import { error, msg } from "@/helpers/translate";
import {
  notifyNewPostReply,
  notifyPostSaved,
  notifyPostShared,
  notifyPostVote,
} from "@/main/notification/domain-events";
import type {
  IPostCreateReplyDTO,
  IPostDeleteDTO,
  IPostMineDTO,
  IPostMuteDTO,
  IPostRepliesDTO,
  IPostReplyDeleteDTO,
  IPostReplySaveDTO,
  IPostReplyThreadDTO,
  IPostReportDTO,
  IPostSaveDTO,
  IPostSavedDTO,
  IPostShareDTO,
  IPostShowDTO,
  IPostUpdateDTO,
  IPostUpdateReplyDTO,
  IPostUploadReplyMediaDTO,
  IPostVoteDTO,
  PostMutationResult,
} from "../DTOs/IPostDTO";
import { PostRepository } from "../repositories/PostRepository";

const ensureCommunityActor = (data: { auth: { id?: string | null; role?: string | null } }) => {
  const isAllowedRole = data.auth.role === "paciente" || data.auth.role === "psicologo";

  if (data.auth.id && isAllowedRole) return null;

  return {
    status: 403,
    ...error("role_not_authorized", {}),
  };
};

const notFound = () => ({
  status: 404,
  ...error("not_found", {
    model: "community_post",
  }),
});

const invalidParent = () => ({
  status: 422,
  ...error("post_reply_parent_invalid", {}),
});

const invalidTarget = () => ({
  status: 422,
  ...error("post_vote_invalid_target", {}),
});

const invalidMedia = () => ({
  status: 422,
  ...error("post_reply_media_invalid", {}),
});

const invalidReplyContent = () => ({
  status: 422,
  ...error("post_reply_content_required", {}),
});

const mediaNotAllowed = () => ({
  status: 403,
  ...error("post_reply_media_professional_plan", {}),
});

const invalidPostMedia = () => ({
  status: 422,
  ...error("community_post_media_invalid", {}),
});

const postMediaNotAllowed = () => ({
  status: 403,
  ...error("community_post_media_professional_plan", {}),
});

type AuthenticatedPostShowDTO = IPostShowDTO & { auth: NonNullable<IPostShowDTO["auth"]> };

const invalidVoteValue = () => ({
  status: 422,
  ...error("post_vote_value_invalid", {}),
});

const invalidReportReason = () => ({
  status: 422,
  ...error("post_report_reason_invalid", {}),
});

const replyDeleteForbidden = () => ({
  status: 403,
  ...error("post_reply_delete_forbidden", {}),
});

const postActionForbidden = () => ({
  status: 403,
  ...error("post_owner_action_forbidden", {}),
});

const postDeleteBlockedByProfessionalReplies = () => ({
  status: 409,
  ...error("post_delete_professional_replies_blocked", {}),
});

const replyDeleteBlockedByProfessionalReplies = () => ({
  status: 409,
  ...error("post_reply_delete_professional_replies_blocked", {}),
});

const publicFileUrl = (key: string) => {
  const rawBase = String(process.env.BASE || "").trim();
  let base = rawBase.replace(/\/$/, "");

  try {
    base = rawBase ? new URL(rawBase).origin : "";
  } catch (_err) {
    base = rawBase.replace(/\/$/, "");
  }

  const publicPath = `/public/files/${key}`;

  return base ? `${base}${publicPath}` : publicPath;
};

const mediaTypeFromMime = (mimetype?: string | null): "image" | "video" | null => {
  if (mimetype?.startsWith("image/")) return "image";
  if (mimetype?.startsWith("video/")) return "video";

  return null;
};

const normalizePostMediaType = (value?: string | null): "image" | "video" | null => {
  if (value === "image" || value === "video") return value;

  return null;
};

const isPublicPostMediaUrl = (value?: string | null) => {
  if (!value) return false;

  try {
    return new URL(value).pathname.startsWith("/public/files/posts/media/");
  } catch (_err) {
    return value.startsWith("/public/files/posts/media/");
  }
};

const hasOwnBodyKey = (body: object, key: string) => Object.hasOwn(body, key);

const MAX_POST_CAROUSEL_IMAGES = 10;

type PostMediaItemInput = {
  mediaType?: string | null;
  mediaUrl?: string | null;
  position?: number | null;
};

const normalizePostMediaItems = (items?: PostMediaItemInput[] | null) =>
  (items ?? []).slice(0, MAX_POST_CAROUSEL_IMAGES).map((item, index) => ({
    mediaType: item.mediaType,
    mediaUrl: item.mediaUrl?.trim() || "",
    position: typeof item.position === "number" ? item.position : index,
  }));

const reportReasons = new Set(["spam", "abuse", "self_harm", "privacy", "other"]);

const resolveMutationResult = <T>(
  result: PostMutationResult<T>,
  okStatus: number,
  message: string,
) => {
  if (result.kind === "not_found") return notFound();
  if (result.kind === "invalid_parent") return invalidParent();
  if (result.kind === "invalid_target") return invalidTarget();
  if (result.kind === "invalid_media") return invalidMedia();
  if (result.kind === "invalid_content") return invalidReplyContent();
  if (result.kind === "media_not_allowed") return mediaNotAllowed();
  if (result.kind === "forbidden") return replyDeleteForbidden();
  if (result.kind === "professional_replies_block")
    return replyDeleteBlockedByProfessionalReplies();

  return {
    status: okStatus,
    ...msg(message, {}),
    data: result.data,
  };
};

const resolveOwnerPostMutationResult = <T>(
  result: PostMutationResult<T>,
  okStatus: number,
  message: string,
) => {
  if (result.kind === "not_found") return notFound();
  if (result.kind === "forbidden") return postActionForbidden();
  if (result.kind === "professional_replies_block") return postDeleteBlockedByProfessionalReplies();
  if (result.kind !== "ok") return postActionForbidden();

  return {
    status: okStatus,
    ...msg(message, {}),
    data: result.data,
  };
};

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
  const res = await repository.createReply({
    ...data,
    b: {
      content: String(data.b.content ?? "").trim(),
      mediaType: data.b.mediaType,
      mediaUrl: data.b.mediaUrl?.trim() || undefined,
      parentReplyId: data.b.parentReplyId?.trim() || undefined,
    },
  });

  if (res.kind === "ok") {
    await notifyNewPostReply({
      actorId: data.auth.id!,
      parentReplyId: res.data.parent_reply_id,
      postId: data.p.id,
      replyId: res.data.id,
    });
  }

  return resolveMutationResult(res, 201, "post_reply_created");
};

export const updatePost = async (data: IPostUpdateDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const title = data.b.title.trim();
  const content = data.b.content.trim();
  const mediaItemsChangeRequested = hasOwnBodyKey(data.b, "mediaItems");
  const mediaChangeRequested =
    hasOwnBodyKey(data.b, "mediaUrl") ||
    hasOwnBodyKey(data.b, "mediaType") ||
    mediaItemsChangeRequested;
  const body: IPostUpdateDTO["b"] = {
    content,
    title,
  };

  if (mediaChangeRequested) {
    const mediaItemsClearing = mediaItemsChangeRequested && data.b.mediaItems === null;
    const rawRequestedMediaItems = Array.isArray(data.b.mediaItems) ? data.b.mediaItems : [];
    if (rawRequestedMediaItems.length > MAX_POST_CAROUSEL_IMAGES) {
      return invalidPostMedia();
    }

    const requestedMediaItems = normalizePostMediaItems(rawRequestedMediaItems);
    const hasMediaItems = requestedMediaItems.length > 0;
    const mediaUrl = data.b.mediaUrl === null ? null : data.b.mediaUrl?.trim();
    const mediaType = data.b.mediaType === null ? null : normalizePostMediaType(data.b.mediaType);
    const clearingMedia = mediaItemsClearing || (mediaUrl === null && mediaType === null);
    let replacingMedia =
      typeof mediaUrl === "string" &&
      Boolean(mediaUrl) &&
      Boolean(mediaType) &&
      isPublicPostMediaUrl(mediaUrl);

    if (hasMediaItems) {
      const invalidItems = requestedMediaItems.some(
        (item) =>
          item.mediaType !== "image" || !item.mediaUrl || !isPublicPostMediaUrl(item.mediaUrl),
      );

      if (invalidItems || requestedMediaItems.length > MAX_POST_CAROUSEL_IMAGES) {
        return invalidPostMedia();
      }

      if (mediaType && mediaType !== "image") {
        return invalidPostMedia();
      }

      replacingMedia = true;
      body.mediaUrl = requestedMediaItems[0]?.mediaUrl;
      body.mediaType = "image";
      body.mediaItems = requestedMediaItems.map((item) => ({
        mediaType: "image",
        mediaUrl: item.mediaUrl,
        position: item.position,
      }));
    } else if (clearingMedia) {
      body.mediaUrl = null;
      body.mediaType = null;
      body.mediaItems = [];
    } else if (replacingMedia) {
      body.mediaUrl = mediaUrl as string;
      body.mediaType = mediaType as "image" | "video";
      body.mediaItems =
        mediaType === "image"
          ? [{ mediaType: "image", mediaUrl: mediaUrl as string, position: 0 }]
          : [];
    } else {
      return invalidPostMedia();
    }

    if (replacingMedia) {
      const canAttachMedia = await repository.canAttachReplyMedia(data.auth.id!);
      if (!canAttachMedia) return postMediaNotAllowed();
    }
  }

  const res = await repository.updatePost({
    ...data,
    b: body,
  });

  return resolveOwnerPostMutationResult(res, 200, "post_updated");
};

export const updateReply = async (data: IPostUpdateReplyDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const mediaChangeRequested =
    hasOwnBodyKey(data.b, "mediaUrl") || hasOwnBodyKey(data.b, "mediaType");
  const contentChangeRequested = hasOwnBodyKey(data.b, "content");
  const body: IPostUpdateReplyDTO["b"] = {};

  if (contentChangeRequested) {
    body.content = String(data.b.content ?? "").trim();
  }

  if (mediaChangeRequested) {
    const mediaUrl = data.b.mediaUrl === null ? null : data.b.mediaUrl?.trim();
    const mediaType = data.b.mediaType === null ? null : normalizePostMediaType(data.b.mediaType);
    const clearingMedia = mediaUrl === null && mediaType === null;
    const replacingMedia =
      typeof mediaUrl === "string" &&
      Boolean(mediaUrl) &&
      Boolean(mediaType) &&
      isPublicPostMediaUrl(mediaUrl);

    if (!clearingMedia && !replacingMedia) return invalidMedia();

    if (replacingMedia) {
      const canAttachMedia = await repository.canAttachReplyMedia(data.auth.id!);
      if (!canAttachMedia) return mediaNotAllowed();
    }

    if (clearingMedia) {
      body.mediaUrl = null;
      body.mediaType = null;
    } else {
      body.mediaUrl = mediaUrl as string;
      body.mediaType = mediaType as "image" | "video";
    }
  }

  const res = await repository.updateReply({
    ...data,
    b: body,
  });

  return resolveMutationResult(res, 200, "post_reply_updated");
};

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

export default show;
