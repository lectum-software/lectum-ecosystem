import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { videoAssetIdFromReference } from "@/infra/video-stream";
import {
  authorTypeLabel,
  isProfessionalVerified,
} from "@/modules/api/private/posts/repositories/support/post-response";
import {
  buildShareFileName,
  getResolvedShareRenderArtifactJob,
  getResolvedShareRenderArtifactJobFile,
  normalizeShareText,
  type RenderShareArtifactJobFileResult,
  type ResolvedShareRenderTarget,
  resolveShareRenderSourceUrl,
  type ShareRenderTarget,
  startResolvedShareRenderArtifactJob,
} from "@/modules/api/private/posts/use-cases/services/share-render";
import { selectSharePostVideoMediaUrl } from "@/modules/api/private/posts/use-cases/services/share-render-media";
import { resolveLegacyPostMediaSourceUrlForRender } from "@/modules/api/private/posts/use-cases/services/share-render-source";
import { authorizeAdminVideoAssetOriginalDownload } from "@/modules/video-assets/service";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import type {
  AdminCommunityContentPostRecord,
  AdminCommunityContentReplyRecord,
} from "../../repositories/AdminCommunityManageRepository";
import { AdminCommunityManageRepository } from "../../repositories/AdminCommunityManageRepository";
import { findCommunityOrNotFound, notFound } from "./detail-summary";

type AdminCommunityContentVideoDownloadDTO = {
  p: {
    id: string;
    jobId?: string;
    targetId: string;
    targetType: string;
  };
  range?: string;
};

type CanonicalContentTarget = {
  communityId: string;
  content: AdminCommunityContentPostRecord | AdminCommunityContentReplyRecord;
  targetType: "post" | "reply";
};

type AdminContentAuthor =
  | AdminCommunityContentPostRecord["author"]
  | AdminCommunityContentReplyRecord["author"];

const invalidAdminContentTarget = (status = 404): Resolve => ({
  status,
  ...error("admin_community_content_target_invalid", {}),
});

const invalidOriginalVideo = (): Resolve => ({
  status: 422,
  ...error("video_asset_not_found", {}),
});

const invalidShareVideo = (): Resolve => ({
  status: 422,
  ...error("post_share_artifact_render_media_invalid", {}),
});

const invalidShareTarget = (): Resolve => ({
  status: 422,
  ...error("post_share_artifact_render_target_invalid", {}),
});

const normalizeTargetType = (value?: string | null): "post" | "reply" | null => {
  if (value === "post") return "post";
  if (value === "comment" || value === "reply") return "reply";

  return null;
};

const authorDisplayName = (author: AdminContentAuthor) => {
  if (author.role !== "psicologo") {
    return normalizeShareText(author.name, "Membro Lectum", 90);
  }

  const profile = author.psychologist_profile;
  return normalizeShareText(
    buildProfessionalFullDisplayName({
      fallbackName: author.name,
      firstName: profile?.professional_first_name,
      lastName: profile?.professional_last_name,
    }),
    "Profissional Lectum",
    90,
  );
};

const buildOriginalVideoFileName = (author: AdminContentAuthor, sourceText: string) =>
  buildShareFileName(authorDisplayName(author), sourceText).replace(
    /-Lectum\.mp4$/u,
    "-original-Lectum.mp4",
  );

const selectVideoMediaUrl = (
  target: CanonicalContentTarget,
): { mediaUrl: string; sourceText: string } | null => {
  if (target.targetType === "post") {
    const post = target.content as AdminCommunityContentPostRecord;
    const mediaUrl = selectSharePostVideoMediaUrl(post);
    if (!mediaUrl) return null;

    return {
      mediaUrl,
      sourceText: normalizeShareText(post.title, post.content, 180),
    };
  }

  const reply = target.content as AdminCommunityContentReplyRecord;
  if (reply.media_type !== "video" || !reply.media_url) return null;

  return {
    mediaUrl: reply.media_url,
    sourceText: normalizeShareText(
      reply.parent_reply_id ? reply.parent_reply?.content : reply.post.title,
      reply.post.content,
      180,
    ),
  };
};

const resolveContentTarget = async (
  repository: AdminCommunityManageRepository,
  data: AdminCommunityContentVideoDownloadDTO,
): Promise<CanonicalContentTarget | Resolve> => {
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const targetType = normalizeTargetType(data.p.targetType);
  if (!targetType) return invalidAdminContentTarget(400);

  const targetId = data.p.targetId ?? "";
  const content =
    targetType === "post"
      ? await repository.findPostContent(community.id, targetId)
      : await repository.findReplyContent(community.id, targetId);

  if (!content) return invalidAdminContentTarget(404);

  return {
    communityId: community.id,
    content,
    targetType,
  };
};

const isResolve = <T extends object>(value: Resolve | T): value is Resolve =>
  "success" in value && value.success === false;

const buildShareRenderTarget = async (
  target: CanonicalContentTarget,
): Promise<ResolvedShareRenderTarget | Resolve> => {
  const media = selectVideoMediaUrl(target);
  if (!media) return invalidShareVideo();

  const content = target.content;
  const author = content.author;
  if (author.role !== "psicologo") return invalidShareTarget();

  const profile = author.psychologist_profile;
  const professionalName = authorDisplayName(author);

  const baseTarget: ShareRenderTarget =
    target.targetType === "post"
      ? {
          cardLabel: "Postado na Lectum",
          fileName: buildShareFileName(professionalName, media.sourceText),
          mediaUrl: media.mediaUrl,
          postId: (content as AdminCommunityContentPostRecord).id,
          professionalName,
          professionalRoleLabel: authorTypeLabel(author.role, profile?.gender, false),
          professionalVerified: isProfessionalVerified(profile),
          replyId: null,
          responseText: normalizeShareText(content.content, "Conteúdo profissional", 180),
          sourceText: media.sourceText,
        }
      : {
          cardLabel: "Respondido na Lectum",
          fileName: buildShareFileName(professionalName, media.sourceText),
          mediaUrl: media.mediaUrl,
          postId: (content as AdminCommunityContentReplyRecord).post_id,
          professionalName,
          professionalRoleLabel: authorTypeLabel(author.role, profile?.gender, false),
          professionalVerified: isProfessionalVerified(profile),
          replyId: (content as AdminCommunityContentReplyRecord).id,
          responseText: normalizeShareText(content.content, "Resposta profissional", 180),
          sourceText: media.sourceText,
        };

  const source = await resolveShareRenderSourceUrl(baseTarget, author.id);
  if (!source) return invalidShareVideo();

  return { ...baseTarget, ...source };
};

const isResolvedShareTarget = (
  value: Awaited<ReturnType<typeof buildShareRenderTarget>>,
): value is ResolvedShareRenderTarget =>
  !(typeof value === "object" && value !== null && "success" in value && value.success === false);

export const prepareContentOriginalVideoDownload = async (
  data: AdminCommunityContentVideoDownloadDTO,
): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const target = await resolveContentTarget(repository, data);
  if (isResolve(target)) return target;

  const media = selectVideoMediaUrl(target);
  if (!media) return invalidOriginalVideo();

  const fileName = buildOriginalVideoFileName(target.content.author, media.sourceText);
  const assetId = videoAssetIdFromReference(media.mediaUrl);
  if (assetId) {
    return authorizeAdminVideoAssetOriginalDownload({ assetId, fileName });
  }

  const source = resolveLegacyPostMediaSourceUrlForRender(media.mediaUrl);
  if (!source) return invalidOriginalVideo();

  return {
    allowSignedMediaUrls: true,
    status: 200,
    ...msg("video_download_ready", {}),
    data: {
      available: true,
      download_url: source.sourceUrl,
      expires_at: null,
      file_name: fileName,
      percent_complete: 100,
      retry_after_ms: 0,
      status: "ready",
    },
  };
};

const resolveAdminShareRenderTarget = async (
  data: AdminCommunityContentVideoDownloadDTO,
): Promise<{ ownerId: string; target: ResolvedShareRenderTarget } | Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const contentTarget = await resolveContentTarget(repository, data);
  if (isResolve(contentTarget)) return contentTarget;

  const shareTarget = await buildShareRenderTarget(contentTarget);
  if (!isResolvedShareTarget(shareTarget)) return shareTarget;

  return {
    ownerId: contentTarget.content.author.id,
    target: shareTarget,
  };
};

export const startContentVideoArtRenderJob = async (
  data: AdminCommunityContentVideoDownloadDTO,
): Promise<Resolve> => {
  const resolved = await resolveAdminShareRenderTarget(data);
  if (isResolve(resolved)) return resolved;

  return startResolvedShareRenderArtifactJob(resolved);
};

export const getContentVideoArtRenderJob = async (
  data: AdminCommunityContentVideoDownloadDTO,
): Promise<Resolve> => {
  const resolved = await resolveAdminShareRenderTarget(data);
  if (isResolve(resolved)) return resolved;

  return getResolvedShareRenderArtifactJob({
    jobId: data.p.jobId,
    ownerId: resolved.ownerId,
    target: resolved.target,
  });
};

export const getContentVideoArtRenderJobFile = async (
  data: AdminCommunityContentVideoDownloadDTO,
): Promise<RenderShareArtifactJobFileResult> => {
  const resolved = await resolveAdminShareRenderTarget(data);
  if (isResolve(resolved)) return resolved;

  return getResolvedShareRenderArtifactJobFile({
    jobId: data.p.jobId,
    ownerId: resolved.ownerId,
    range: data.range,
    target: resolved.target,
  });
};
