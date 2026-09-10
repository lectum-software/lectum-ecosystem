import { type resolveUploadLimits, UPLOAD_LIMITS } from "@/config/multer/limits";
import type { VideoAssetPurpose } from "@/infra/video-stream";

const MEBIBYTE = 1024 * 1024;
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
type UploadLimits = ReturnType<typeof resolveUploadLimits>;

type AcceptedVideoAssetUpload = {
  accepted: true;
  limitBytes: number;
  mimeType: string;
};

type RejectedVideoAssetUpload =
  | {
      accepted: false;
      reason: "invalid_metadata";
    }
  | {
      accepted: false;
      limitBytes: number;
      limitMegabytes: number;
      reason: "file_too_large";
    };

export type VideoAssetUploadValidation = AcceptedVideoAssetUpload | RejectedVideoAssetUpload;

export type VideoAssetUploadFailure = {
  code: "exceeded_file_limit" | "video_upload_invalid";
  data: Record<string, unknown>;
  status: 413 | 422;
};

const normalizeMimeType = (value: string) => value.trim().toLowerCase().split(";", 1)[0] ?? "";

export const getVideoAssetUploadLimitMegabytes = (
  purpose: VideoAssetPurpose,
  limits: UploadLimits = UPLOAD_LIMITS,
) =>
  (
    ({
      community_post: limits.community.postMediaMultipartTotalMb,
      community_reply: limits.postReply.multipartTotalMb,
      profile_presentation: limits.psychologist.videoMultipartTotalMb,
    }) satisfies Record<VideoAssetPurpose, number>
  )[purpose];

export const getVideoAssetUploadLimitBytes = (purpose: VideoAssetPurpose) =>
  getVideoAssetUploadLimitMegabytes(purpose) * MEBIBYTE;

export const getVideoAssetUploadFailure = (
  validation: RejectedVideoAssetUpload,
): VideoAssetUploadFailure =>
  validation.reason === "file_too_large"
    ? {
        code: "exceeded_file_limit",
        data: { limit: validation.limitMegabytes },
        status: 413,
      }
    : {
        code: "video_upload_invalid",
        data: {},
        status: 422,
      };

export const validateVideoAssetUploadMetadata = ({
  mimeType: rawMimeType,
  purpose,
  size,
}: {
  mimeType: string;
  purpose: VideoAssetPurpose;
  size: number;
}): VideoAssetUploadValidation => {
  const mimeType = normalizeMimeType(rawMimeType);
  if (!VIDEO_MIME_TYPES.has(mimeType) || !Number.isSafeInteger(size) || size <= 0) {
    return { accepted: false, reason: "invalid_metadata" };
  }

  const limitMegabytes = getVideoAssetUploadLimitMegabytes(purpose);
  const limitBytes = getVideoAssetUploadLimitBytes(purpose);
  if (size > limitBytes) {
    return {
      accepted: false,
      limitBytes,
      limitMegabytes,
      reason: "file_too_large",
    };
  }

  return { accepted: true, limitBytes, mimeType };
};
