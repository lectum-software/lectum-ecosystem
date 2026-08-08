import { error, msg } from "@/helpers/translate";
import type { ModerationResult } from "@/utils/content-moderation";
import type { IPostShowDTO, PostMutationResult } from "../../DTOs/IPostDTO";

export const ensureCommunityActor = (data: {
  auth: { id?: string | null; role?: string | null };
}) => {
  const isAllowedRole = data.auth.role === "paciente" || data.auth.role === "psicologo";

  if (data.auth.id && isAllowedRole) return null;

  return {
    status: 403,
    ...error("role_not_authorized", {}),
  };
};

export const notFound = () => ({
  status: 404,
  ...error("not_found", {
    model: "community_post",
  }),
});

export const invalidParent = () => ({
  status: 422,
  ...error("post_reply_parent_invalid", {}),
});

export const invalidTarget = () => ({
  status: 422,
  ...error("post_vote_invalid_target", {}),
});

export const invalidMedia = () => ({
  status: 422,
  ...error("post_reply_media_invalid", {}),
});

export const invalidReplyContent = () => ({
  status: 422,
  ...error("post_reply_content_required", {}),
});

export const mediaNotAllowed = () => ({
  status: 403,
  ...error("post_reply_media_professional_plan", {}),
});

export const invalidPostMedia = () => ({
  status: 422,
  ...error("community_post_media_invalid", {}),
});

export const postMediaNotAllowed = () => ({
  status: 403,
  ...error("community_post_media_professional_plan", {}),
});

export type AuthenticatedPostShowDTO = IPostShowDTO & { auth: NonNullable<IPostShowDTO["auth"]> };

export const invalidVoteValue = () => ({
  status: 422,
  ...error("post_vote_value_invalid", {}),
});

export const invalidReportReason = () => ({
  status: 422,
  ...error("post_report_reason_invalid", {}),
});

export const replyDeleteForbidden = () => ({
  status: 403,
  ...error("post_reply_delete_forbidden", {}),
});

export const postActionForbidden = () => ({
  status: 403,
  ...error("post_owner_action_forbidden", {}),
});

export const postDeleteBlockedByProfessionalReplies = () => ({
  status: 409,
  ...error("post_delete_professional_replies_blocked", {}),
});

export const replyDeleteBlockedByProfessionalReplies = () => ({
  status: 409,
  ...error("post_reply_delete_professional_replies_blocked", {}),
});

export const moderationError = (result: ModerationResult) => ({
  status: 422,
  ...error(
    result.decision === "safety_hold"
      ? "content_moderation_safety_hold"
      : "content_moderation_blocked",
    {},
  ),
});

export const publicFileUrl = (key: string) => {
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

export const mediaTypeFromMime = (mimetype?: string | null): "image" | "video" | null => {
  if (mimetype?.startsWith("image/")) return "image";
  if (mimetype?.startsWith("video/")) return "video";

  return null;
};

export const normalizePostMediaType = (value?: string | null): "image" | "video" | null => {
  if (value === "image" || value === "video") return value;

  return null;
};

export const isPublicPostMediaUrl = (value?: string | null) => {
  if (!value) return false;

  try {
    return new URL(value).pathname.startsWith("/public/files/posts/media/");
  } catch (_err) {
    return value.startsWith("/public/files/posts/media/");
  }
};

export const hasOwnBodyKey = (body: object, key: string) => Object.hasOwn(body, key);

export const MAX_POST_CAROUSEL_IMAGES = 10;

export type PostMediaItemInput = {
  mediaType?: string | null;
  mediaUrl?: string | null;
  position?: number | null;
};

export const normalizePostMediaItems = (items?: PostMediaItemInput[] | null) =>
  (items ?? []).slice(0, MAX_POST_CAROUSEL_IMAGES).map((item, index) => ({
    mediaType: item.mediaType,
    mediaUrl: item.mediaUrl?.trim() || "",
    position: typeof item.position === "number" ? item.position : index,
  }));

export const reportReasons = new Set(["spam", "abuse", "self_harm", "privacy", "other"]);

export const resolveMutationResult = <T>(
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

export const resolveOwnerPostMutationResult = <T>(
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
