export const PROFILE_VIDEO_DEFAULT_LIMIT_MB = 300;
export const PROFILE_VIDEO_SIMPLE_LIMIT_MB = 50;
export const PROFILE_VIDEO_MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024;

const PROFILE_VIDEO_ALLOWED_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

const PROFILE_VIDEO_MIME_BY_EXTENSION: Record<string, string> = {
  mov: "video/quicktime",
  mp4: "video/mp4",
  webm: "video/webm",
};

export const resolveProfileVideoMimeType = (file: File) => {
  const declaredMimeType = file.type.trim().toLowerCase().split(";", 1)[0] ?? "";
  if (PROFILE_VIDEO_ALLOWED_MIME_TYPES.has(declaredMimeType)) return declaredMimeType;

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  return PROFILE_VIDEO_MIME_BY_EXTENSION[extension] || declaredMimeType;
};

export const isAllowedProfileVideo = (file: File) =>
  PROFILE_VIDEO_ALLOWED_MIME_TYPES.has(resolveProfileVideoMimeType(file));

export const withProfileVideoFileType = (file: File) => {
  const mimeType = resolveProfileVideoMimeType(file);
  if (!mimeType || file.type.trim().toLowerCase() === mimeType) return { file, mimeType };

  return {
    file: new File([file], file.name || "video", {
      lastModified: file.lastModified,
      type: mimeType,
    }),
    mimeType,
  };
};
