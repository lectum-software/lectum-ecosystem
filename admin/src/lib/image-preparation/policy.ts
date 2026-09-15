const KIBIBYTE = 1024;
const MIN_CANDIDATE_SAVINGS_RATIO = 0.05;

export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export type ImagePreparationPolicy = {
  bypass: boolean;
  maxHeight: number;
  maxWidth: number;
  minInputBytes: number;
  quality: number;
};

export const ADMIN_IMAGE_PREPARATION_POLICIES = {
  "community-avatar": {
    bypass: false,
    maxHeight: 512,
    maxWidth: 512,
    minInputBytes: 128 * KIBIBYTE,
    quality: 0.92,
  },
  "seo-open-graph": {
    bypass: false,
    maxHeight: 630,
    maxWidth: 1200,
    minInputBytes: 256 * KIBIBYTE,
    quality: 0.92,
  },
} as const satisfies Record<string, ImagePreparationPolicy>;

export type AdminImagePreparationPurpose = keyof typeof ADMIN_IMAGE_PREPARATION_POLICIES;

export const resolveImagePreparationPolicy = (
  purpose: AdminImagePreparationPurpose,
): ImagePreparationPolicy => ADMIN_IMAGE_PREPARATION_POLICIES[purpose];

export const resolveImageTargetDimensions = (
  width: number,
  height: number,
  policy: Pick<ImagePreparationPolicy, "maxHeight" | "maxWidth">,
) => {
  const safeWidth = Number.isFinite(width) ? Math.max(0, Math.round(width)) : 0;
  const safeHeight = Number.isFinite(height) ? Math.max(0, Math.round(height)) : 0;

  if (!safeWidth || !safeHeight) {
    return { height: 0, resized: false, width: 0 };
  }

  const scale = Math.min(1, policy.maxWidth / safeWidth, policy.maxHeight / safeHeight);

  return {
    height: Math.max(1, Math.round(safeHeight * scale)),
    resized: scale < 1,
    width: Math.max(1, Math.round(safeWidth * scale)),
  };
};

export const shouldAttemptImagePreparation = ({
  fileSize,
  height,
  policy,
  width,
}: {
  fileSize: number;
  height: number;
  policy: ImagePreparationPolicy;
  width: number;
}) => {
  if (policy.bypass) return false;

  const target = resolveImageTargetDimensions(width, height, policy);
  if (!target.width || !target.height) return false;

  return target.resized || fileSize >= policy.minInputBytes;
};

export const shouldUseImageCandidate = (
  originalSize: number,
  candidateSize: number,
  resized = false,
) => {
  if (
    !Number.isInteger(candidateSize) ||
    !Number.isInteger(originalSize) ||
    originalSize <= 0 ||
    candidateSize <= 0
  ) {
    return false;
  }

  const maximumCandidateSize = resized
    ? originalSize - 1
    : Math.floor(originalSize * (1 - MIN_CANDIDATE_SAVINGS_RATIO));

  return candidateSize <= maximumCandidateSize;
};

export const normalizeImageMimeType = (mimeType: string): ImageMimeType | null => {
  const normalized = mimeType.trim().toLowerCase().split(";", 1)[0];
  if (normalized === "image/jpg") return "image/jpeg";
  if (normalized === "image/jpeg" || normalized === "image/png" || normalized === "image/webp") {
    return normalized;
  }

  return null;
};

export const resolveImageFileMimeType = (
  file: Pick<File, "name" | "type">,
): ImageMimeType | null => {
  const declaredMimeType = normalizeImageMimeType(file.type);
  if (declaredMimeType) return declaredMimeType;
  if (file.type.trim()) return null;

  const normalizedName = file.name.trim().toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf(".");
  const extension = lastDotIndex >= 0 ? normalizedName.slice(lastDotIndex + 1) : "";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";

  return null;
};

export const resolveImageOutputMimeType = (
  inputMimeType: string,
  hasTransparency: boolean,
): ImageMimeType | null => {
  const normalized = normalizeImageMimeType(inputMimeType);
  if (!normalized) return null;
  if (hasTransparency && normalized === "image/jpeg") return null;

  return normalized;
};

export const hasTransparentPixels = (pixels: ArrayLike<number>) => {
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 255) return true;
  }

  return false;
};

export const withImageFileExtension = (fileName: string, mimeType: ImageMimeType) => {
  const normalizedName = fileName.trim();
  const lastDotIndex = normalizedName.lastIndexOf(".");
  const baseName =
    lastDotIndex > 0 ? normalizedName.slice(0, lastDotIndex) : normalizedName || "imagem";
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];

  return `${baseName}.${extension}`;
};

export const withCanonicalImageFileType = (file: File, mimeType: ImageMimeType) => {
  const declaredMimeType = file.type.trim().toLowerCase().split(";", 1)[0];
  if (declaredMimeType === mimeType) return file;

  return new File([file], withImageFileExtension(file.name, mimeType), {
    lastModified: file.lastModified,
    type: mimeType,
  });
};
