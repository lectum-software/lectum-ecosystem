import { error, msg } from "@/helpers/translate";
import type {
  IFreeProfessionalProfileRemoveAvatarDTO,
  IFreeProfessionalProfileRemoveCoverImageDTO,
  IFreeProfessionalProfileRemoveVideoDTO,
  IFreeProfessionalProfileUploadAvatarDTO,
  IFreeProfessionalProfileUploadCoverImageDTO,
  IFreeProfessionalProfileUploadVideoCoverDTO,
  IFreeProfessionalProfileUploadVideoDTO,
} from "../../DTOs/IFreeProfileDTO";
import { FreeProfileRepository } from "../../repositories/FreeProfileRepository";

import {
  paidRegistryVerificationRequired,
  publicFileUrl,
  requiresPaidRegistryVerification,
} from "./profile-validation";

export const uploadAvatar = async (data: IFreeProfessionalProfileUploadAvatarDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const key = data.file?.path || data.file?.key;
  if (!key?.startsWith("psychologist/avatar/")) {
    return {
      status: 400,
      ...error("upload_error", {}),
    };
  }

  const repository = new FreeProfileRepository();
  const current = await repository.show(data.auth.id!);

  if (!current) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  if (requiresPaidRegistryVerification(current)) {
    return paidRegistryVerificationRequired();
  }

  const avatarUrl = publicFileUrl(key);
  const updated = await repository.updateAvatar(data.auth.id!, avatarUrl);

  return {
    status: 200,
    ...msg("free_profile_avatar_uploaded", {}),
    data: {
      avatar_url: avatarUrl,
      profile: updated,
    },
  };
};

export const removeAvatar = async (data: IFreeProfessionalProfileRemoveAvatarDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new FreeProfileRepository();
  const current = await repository.show(data.auth.id!);

  if (!current) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  if (requiresPaidRegistryVerification(current)) {
    return paidRegistryVerificationRequired();
  }

  const updated = await repository.removeAvatar(data.auth.id!);

  return {
    status: 200,
    ...msg("free_profile_avatar_removed", {}),
    data: {
      profile: updated,
    },
  };
};

export const uploadVideo = async (data: IFreeProfessionalProfileUploadVideoDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const key = data.file?.path || data.file?.key;
  if (!key?.startsWith("psychologist/video/")) {
    return {
      status: 400,
      ...error("upload_error", {}),
    };
  }

  const repository = new FreeProfileRepository();
  const current = await repository.show(data.auth.id!);

  if (!current) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  if (requiresPaidRegistryVerification(current)) {
    return paidRegistryVerificationRequired();
  }

  if (!current.plan.can_upload_video) {
    return {
      status: 403,
      ...error("profile_video_professional_plan", {}),
    };
  }

  const videoUrl = publicFileUrl(key);
  const updated = await repository.updateVideo(data.auth.id!, videoUrl);

  return {
    status: 200,
    ...msg("professional_profile_video_uploaded", {}),
    data: {
      video_url: videoUrl,
      profile: updated,
    },
  };
};

export const uploadCoverImage = async (data: IFreeProfessionalProfileUploadCoverImageDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const key = data.file?.path || data.file?.key;
  if (!key?.startsWith("psychologist/cover-image/")) {
    return {
      status: 400,
      ...error("upload_error", {}),
    };
  }

  const repository = new FreeProfileRepository();
  const current = await repository.show(data.auth.id!);

  if (!current) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  if (requiresPaidRegistryVerification(current)) {
    return paidRegistryVerificationRequired();
  }

  const coverImageUrl = publicFileUrl(key);
  const updated = await repository.updateCoverImage(data.auth.id!, coverImageUrl);

  return {
    status: 200,
    ...msg("professional_profile_cover_image_uploaded", {}),
    data: {
      cover_image_url: coverImageUrl,
      profile: updated,
    },
  };
};

export const uploadVideoCover = async (data: IFreeProfessionalProfileUploadVideoCoverDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const key = data.file?.path || data.file?.key;
  if (!key?.startsWith("psychologist/video-cover/")) {
    return {
      status: 400,
      ...error("upload_error", {}),
    };
  }

  const repository = new FreeProfileRepository();
  const current = await repository.show(data.auth.id!);

  if (!current) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  if (requiresPaidRegistryVerification(current)) {
    return paidRegistryVerificationRequired();
  }

  if (!current.plan.can_upload_video) {
    return {
      status: 403,
      ...error("profile_video_professional_plan", {}),
    };
  }

  const videoCoverUrl = publicFileUrl(key);
  const updated = await repository.updateVideoCover(data.auth.id!, videoCoverUrl);

  return {
    status: 200,
    ...msg("professional_profile_video_cover_uploaded", {}),
    data: {
      video_cover_url: videoCoverUrl,
      profile: updated,
    },
  };
};

export const removeCoverImage = async (data: IFreeProfessionalProfileRemoveCoverImageDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new FreeProfileRepository();
  const current = await repository.show(data.auth.id!);

  if (!current) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  if (requiresPaidRegistryVerification(current)) {
    return paidRegistryVerificationRequired();
  }

  const updated = await repository.removeCoverImage(data.auth.id!);

  return {
    status: 200,
    ...msg("professional_profile_cover_image_removed", {}),
    data: {
      profile: updated,
    },
  };
};

export const removeVideo = async (data: IFreeProfessionalProfileRemoveVideoDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new FreeProfileRepository();
  const current = await repository.show(data.auth.id!);

  if (!current) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  if (requiresPaidRegistryVerification(current)) {
    return paidRegistryVerificationRequired();
  }

  if (!current.plan.can_upload_video) {
    return {
      status: 403,
      ...error("profile_video_professional_plan", {}),
    };
  }

  const updated = await repository.removeVideo(data.auth.id!);

  return {
    status: 200,
    ...msg("professional_profile_video_removed", {}),
    data: {
      profile: updated,
    },
  };
};
