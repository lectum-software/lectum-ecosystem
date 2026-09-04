import type { FrontendImagePreparationPurpose } from "../image-preparation";

export const VIDEO_UPLOAD_PURPOSES = {
  "community-post-video": "community-post",
  "post-reply-video": "community-reply",
  "profile-presentation-video": "profile-presentation",
} as const;

export type VideoUploadPurpose = keyof typeof VIDEO_UPLOAD_PURPOSES;
export type MediaPreparationPurpose = FrontendImagePreparationPurpose | VideoUploadPurpose;
export type MediaPreparationAdapter = "image" | "passthrough" | "video";
export type PublicMediaKind = "image" | "video";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const IMAGE_FILE_EXTENSIONS = new Set(["jpeg", "jpg", "png", "webp"]);
const VIDEO_FILE_EXTENSIONS = new Set(["mov", "mp4", "webm"]);

export class UnsupportedPublicMediaTypeError extends Error {
  constructor() {
    super("unsupported_public_media_type");
    this.name = "UnsupportedPublicMediaTypeError";
  }
}

export const isVideoUploadPurpose = (
  purpose: MediaPreparationPurpose,
): purpose is VideoUploadPurpose => purpose in VIDEO_UPLOAD_PURPOSES;

export const resolveMediaPreparationAdapter = (
  purpose: MediaPreparationPurpose,
): MediaPreparationAdapter => {
  if (isVideoUploadPurpose(purpose)) return "video";
  if (purpose === "generated-video-thumbnail") return "passthrough";

  return "image";
};

export const resolvePublicMediaKind = (
  file: Pick<File, "name" | "type">,
): PublicMediaKind | null => {
  const mimeType = file.type.trim().toLowerCase().split(";", 1)[0];
  if (IMAGE_MIME_TYPES.has(mimeType)) return "image";
  if (VIDEO_MIME_TYPES.has(mimeType)) return "video";
  if (mimeType) return null;

  const normalizedName = file.name.trim().toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf(".");
  const extension = lastDotIndex >= 0 ? normalizedName.slice(lastDotIndex + 1) : "";
  if (IMAGE_FILE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_FILE_EXTENSIONS.has(extension)) return "video";

  return null;
};

export const requireMediaPreparationFileKind = (
  file: Pick<File, "name" | "type">,
  purpose: MediaPreparationPurpose,
): PublicMediaKind => {
  const mediaKind = resolvePublicMediaKind(file);
  const adapter = resolveMediaPreparationAdapter(purpose);
  const expectedKind = adapter === "video" ? "video" : "image";
  if (!mediaKind || mediaKind !== expectedKind) {
    throw new UnsupportedPublicMediaTypeError();
  }

  return mediaKind;
};

const requirePublicMediaKind = (file: Pick<File, "name" | "type">) => {
  const kind = resolvePublicMediaKind(file);
  if (!kind) throw new UnsupportedPublicMediaTypeError();

  return kind;
};

export const resolveCommunityPostPreparationPurpose = (
  file: Pick<File, "name" | "type">,
): "community-post-image" | "community-post-video" =>
  requirePublicMediaKind(file) === "video" ? "community-post-video" : "community-post-image";

export const resolvePostReplyPreparationPurpose = (
  file: Pick<File, "name" | "type">,
): "post-reply-image" | "post-reply-video" =>
  requirePublicMediaKind(file) === "video" ? "post-reply-video" : "post-reply-image";
