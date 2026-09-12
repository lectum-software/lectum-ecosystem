import { logMultipartUpload } from "@/config/multer/multipart-logging";
import {
  abortPublicMultipartUpload,
  PublicMultipartInfrastructureError,
  PublicMultipartValidationError,
} from "@/config/multer/public-multipart";
import { error, msg } from "@/helpers/translate";
import { videoStreamUploadRequired } from "@/modules/video-assets/upload-policy";
import type {
  IFreeProfessionalProfileAbortVideoMultipartDTO,
  IFreeProfessionalProfileCompleteVideoMultipartDTO,
  IFreeProfessionalProfileInitiateVideoMultipartDTO,
  IFreeProfessionalProfileUploadVideoMultipartPartDTO,
} from "../../DTOs/IFreeProfileDTO";
import { resolveProfileVideoAccess } from "./profile-video-policy";

const PROFILE_VIDEO_MULTIPART_SCOPE = "psychologist_profile_video";

const invalidUpload = () => ({
  status: 400,
  ...error("upload_error", {}),
});

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const multipartContext = (userId: string) => ({
  resourceId: userId,
  scope: PROFILE_VIDEO_MULTIPART_SCOPE,
  userId,
});

const uploadLogContext = { scope: PROFILE_VIDEO_MULTIPART_SCOPE } as const;

export const initiateProfileVideoMultipartUpload = async (
  data: IFreeProfessionalProfileInitiateVideoMultipartDTO,
) => {
  const access = await resolveProfileVideoAccess(data.auth);
  if (!access.allowed) {
    logMultipartUpload("INITIATE_REJECTED", {
      ...uploadLogContext,
      reason: "access",
    });
    return access.response;
  }

  logMultipartUpload("INITIATE_REJECTED", {
    ...uploadLogContext,
    reason: "request",
  });
  return videoStreamUploadRequired();
};

export const uploadProfileVideoMultipartPart = async (
  data: IFreeProfessionalProfileUploadVideoMultipartPartDTO,
) => {
  if (data.auth.role !== "psicologo") {
    logMultipartUpload("PART_REJECTED", {
      ...uploadLogContext,
      reason: "access",
    });
    return { status: 403, ...error("role_not_authorized", {}) };
  }

  logMultipartUpload("PART_REJECTED", {
    ...uploadLogContext,
    reason: "request",
  });
  return videoStreamUploadRequired();
};

export const completeProfileVideoMultipartUpload = async (
  data: IFreeProfessionalProfileCompleteVideoMultipartDTO,
) => {
  const access = await resolveProfileVideoAccess(data.auth);
  if (!access.allowed) {
    logMultipartUpload("COMPLETE_REJECTED", {
      ...uploadLogContext,
      reason: "access",
    });
    return access.response;
  }

  logMultipartUpload("COMPLETE_REJECTED", {
    ...uploadLogContext,
    reason: "request",
  });
  return videoStreamUploadRequired();
};

export const abortProfileVideoMultipartUpload = async (
  data: IFreeProfessionalProfileAbortVideoMultipartDTO,
) => {
  if (data.auth.role !== "psicologo") {
    logMultipartUpload("ABORT_REJECTED", {
      ...uploadLogContext,
      reason: "access",
    });
    return { status: 403, ...error("role_not_authorized", {}) };
  }

  try {
    await abortPublicMultipartUpload({
      ...multipartContext(data.auth.id!),
      sessionId: normalizeText(data.b.uploadSessionId),
    });
  } catch (uploadError) {
    if (uploadError instanceof PublicMultipartValidationError) return invalidUpload();
    if (!(uploadError instanceof PublicMultipartInfrastructureError)) throw uploadError;
  }

  return {
    status: 200,
    ...msg("professional_profile_video_uploaded", {}),
    data: { aborted: true },
  };
};
