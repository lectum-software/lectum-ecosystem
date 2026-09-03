const REPLY_MEDIA_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const REPLY_MEDIA_MIME_BY_EXTENSION: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  mov: "video/quicktime",
  mp4: "video/mp4",
  png: "image/png",
  webm: "video/webm",
  webp: "image/webp",
};

const resolveReplyMediaMimeType = (file: File) => {
  const declaredMimeType = file.type.trim().toLowerCase().split(";", 1)[0] ?? "";
  if (REPLY_MEDIA_ALLOWED_MIME_TYPES.has(declaredMimeType)) return declaredMimeType;

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  return REPLY_MEDIA_MIME_BY_EXTENSION[extension] ?? declaredMimeType;
};

export const withReplyMediaFileType = (file: File) => {
  const mimeType = resolveReplyMediaMimeType(file);
  if (!mimeType || file.type.trim().toLowerCase() === mimeType) {
    return { file, mimeType };
  }

  return {
    file: new File([file], file.name || "media", {
      lastModified: file.lastModified,
      type: mimeType,
    }),
    mimeType,
  };
};
