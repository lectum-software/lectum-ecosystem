import { error, msg } from "@/helpers/translate";
import type {
  IPostCreateReplyDTO,
  IPostMineDTO,
  IPostRepliesDTO,
  IPostReplySaveDTO,
  IPostReportDTO,
  IPostSaveDTO,
  IPostSavedDTO,
  IPostShowDTO,
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

const mediaNotAllowed = () => ({
  status: 403,
  ...error("post_reply_media_professional_plan", {}),
});

const invalidVoteValue = () => ({
  status: 422,
  ...error("post_vote_value_invalid", {}),
});

const invalidReportReason = () => ({
  status: 422,
  ...error("post_report_reason_invalid", {}),
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
  if (result.kind === "media_not_allowed") return mediaNotAllowed();

  return {
    status: okStatus,
    ...msg(message, {}),
    data: result.data,
  };
};

export const show = async (data: IPostShowDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

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
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.replies(data);

  if (!res) return notFound();

  return {
    status: 200,
    ...msg("index", {}),
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
      content: data.b.content.trim(),
      mediaType: data.b.mediaType,
      mediaUrl: data.b.mediaUrl?.trim() || undefined,
      parentReplyId: data.b.parentReplyId?.trim() || undefined,
    },
  });

  return resolveMutationResult(res, 201, "post_reply_created");
};

export const authorizeReplyMediaUpload = async (data: IPostShowDTO) => {
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

  return resolveMutationResult(res, 200, "post_vote_updated");
};

export const save = async (data: IPostSaveDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.save(data);

  return resolveMutationResult(res, 200, "post_saved");
};

export const unsave = async (data: IPostSaveDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const res = await repository.unsave(data);

  return resolveMutationResult(res, 200, "post_unsaved");
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

export default show;
