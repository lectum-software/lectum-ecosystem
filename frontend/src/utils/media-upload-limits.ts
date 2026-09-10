const MEBIBYTE = 1024 * 1024;

export type MediaUploadLimitStage = "final" | "source";
export type MediaUploadLimitKind = "image" | "video";

export type MediaUploadApiErrorMetadata = {
  code?: string;
  message: string;
  status?: number;
};

type FileSize = Pick<File, "size">;

const requirePositiveByteLimit = (limitBytes: number) => {
  if (!Number.isSafeInteger(limitBytes) || limitBytes <= 0) {
    throw new TypeError("media_upload_limit_invalid");
  }

  return limitBytes;
};

export class MediaUploadSizeError extends Error {
  readonly actualBytes: number;
  readonly kind: MediaUploadLimitKind;
  readonly limitBytes: number;
  readonly stage: MediaUploadLimitStage;

  constructor({
    actualBytes,
    kind,
    limitBytes,
    stage,
  }: {
    actualBytes: number;
    kind: MediaUploadLimitKind;
    limitBytes: number;
    stage: MediaUploadLimitStage;
  }) {
    super(`media_upload_${stage}_limit_exceeded`);
    this.name = "MediaUploadSizeError";
    this.actualBytes = actualBytes;
    this.kind = kind;
    this.limitBytes = limitBytes;
    this.stage = stage;
  }
}

export const isMediaUploadSizeError = (error: unknown): error is MediaUploadSizeError =>
  error instanceof MediaUploadSizeError;

export const isMediaUploadApiSizeLimitError = ({
  code,
  message,
  status,
}: MediaUploadApiErrorMetadata) =>
  status === 413 ||
  code === "exceeded_file_limit" ||
  /^(?:o\s+)?arquivo excede o limite de\b/.test(message.trim().toLowerCase());

export const resolveMediaUploadApiSizeLimitMessage = (metadata: MediaUploadApiErrorMetadata) => {
  if (!isMediaUploadApiSizeLimitError(metadata)) return null;

  const message = metadata.message.trim();
  if (!/^(?:o\s+)?arquivo excede o limite de\b/i.test(message)) {
    return "O arquivo excede o limite configurado para este envio.";
  }

  const normalized = `${message.charAt(0).toLocaleUpperCase("pt-BR")}${message.slice(1)}`;
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
};

const createSizeError = (
  file: FileSize,
  kind: MediaUploadLimitKind,
  limitBytes: number,
  stage: MediaUploadLimitStage,
) =>
  file.size > limitBytes
    ? new MediaUploadSizeError({ actualBytes: file.size, kind, limitBytes, stage })
    : null;

export const getMediaUploadSourceSizeError = (
  file: FileSize,
  kind: MediaUploadLimitKind,
  finalLimitBytes: number,
) =>
  kind === "video"
    ? null
    : createSizeError(file, kind, requirePositiveByteLimit(finalLimitBytes), "source");

export const getMediaUploadFinalSizeError = (
  file: FileSize,
  kind: MediaUploadLimitKind,
  finalLimitBytes: number,
) =>
  kind === "video"
    ? null
    : createSizeError(file, kind, requirePositiveByteLimit(finalLimitBytes), "final");

export const assertMediaUploadSourceSize = (
  file: FileSize,
  kind: MediaUploadLimitKind,
  finalLimitBytes: number,
) => {
  const sizeError = getMediaUploadSourceSizeError(file, kind, finalLimitBytes);
  if (sizeError) throw sizeError;
};

export const assertMediaUploadFinalSize = (
  file: FileSize,
  kind: MediaUploadLimitKind,
  finalLimitBytes: number,
) => {
  const sizeError = getMediaUploadFinalSizeError(file, kind, finalLimitBytes);
  if (sizeError) throw sizeError;
};

export const formatMediaUploadSize = (bytes: number) => {
  const megabytes = bytes / MEBIBYTE;
  const roundedUpMegabytes = Math.ceil(megabytes * 10) / 10;

  return `${roundedUpMegabytes.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} MB`;
};
