import { error } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
import {
  cancelOwnedVideoAsset,
  provisionVideoAssetUpload,
  showOwnedVideoAssetStatus,
} from "@/modules/video-assets/service";
import { canAttachCommunityMedia } from "@/utils/community-media-entitlement";
import { resolveProfileVideoAccess } from "../../psychologist/free-profile/use-cases/services/profile-video-policy";
import type { IVideoAssetActionDTO, IVideoAssetUploadDTO } from "../DTOs/IVideoAssetsDTO";

const VIDEO_UPLOAD_METHODS_HEADER = "x-lectum-video-upload-methods";

const uploadNotAllowed = () => ({
  status: 403,
  ...error("video_upload_not_allowed", {}),
});

const parseAcceptedVideoUploadMethods = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  const methods = new Set(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );

  return {
    basic: methods.has("basic"),
    tus: methods.has("tus"),
  };
};

const resolveUploadContext = async (data: IVideoAssetUploadDTO) => {
  const ownerId = data.auth.id;
  if (!ownerId) return null;

  if (data.b.purpose === "profile_presentation") {
    const access = await resolveProfileVideoAccess(data.auth);
    return access.allowed ? { contextId: access.current.profile.id, ownerId } : null;
  }

  const contextId = data.b.contextId;
  if (data.auth.role !== "psicologo" || !contextId || !(await canAttachCommunityMedia(ownerId))) {
    return null;
  }

  if (data.b.purpose === "community_post") {
    const community = await prisma.community.findFirst({
      where: { active: true, deleted: false, slug: contextId },
      select: { slug: true },
    });
    return community ? { contextId: community.slug, ownerId } : null;
  }

  const post = await prisma.community_post.findFirst({
    where: {
      deleted: false,
      id: contextId,
      status: "publicado",
      community: { active: true, deleted: false },
    },
    select: { id: true },
  });
  return post ? { contextId: post.id, ownerId } : null;
};

export const createUpload = async (data: IVideoAssetUploadDTO) => {
  const context = await resolveUploadContext(data);
  if (!context) return uploadNotAllowed();

  return provisionVideoAssetUpload({
    ...context,
    acceptedUploadMethods: parseAcceptedVideoUploadMethods(
      data.headers?.[VIDEO_UPLOAD_METHODS_HEADER],
    ),
    mimeType: data.b.mimeType,
    purpose: data.b.purpose,
    size: Number(data.b.size),
  });
};

export const showStatus = (data: IVideoAssetActionDTO) =>
  showOwnedVideoAssetStatus(data.p.id, data.auth.id!);

export const destroy = (data: IVideoAssetActionDTO) =>
  cancelOwnedVideoAsset(data.p.id, data.auth.id!);

// Abandonar uma tentativa não equivale a remover mídia já publicada/associada.
export const cancelUpload = (data: IVideoAssetActionDTO) =>
  cancelOwnedVideoAsset(data.p.id, data.auth.id!, { onlyUnattached: true });
