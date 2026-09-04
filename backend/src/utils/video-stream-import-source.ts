import { parsePublicHttpOrigin } from "./public-origin";

const SOURCE_PATH_PREFIX = "/public/video-stream-import/v1/";
const MAX_OBJECT_KEY_LENGTH = 1_024;
const MAX_SOURCE_TOKEN_LENGTH = 1_400;
const VIDEO_SOURCE_PREFIXES = ["psychologist/video/", "posts/media/"] as const;

type VideoStreamImportUrlOptions = {
  baseUrl?: string | null;
  productionRuntime?: boolean;
};

const hasControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const normalizeVideoObjectKey = (value: string) => {
  const segments = value.split("/");
  if (
    !value ||
    value.length > MAX_OBJECT_KEY_LENGTH ||
    value.includes("\\") ||
    hasControlCharacter(value) ||
    !segments.every((segment) => segment && segment !== "." && segment !== "..") ||
    !VIDEO_SOURCE_PREFIXES.some((prefix) => value.startsWith(prefix))
  ) {
    return null;
  }

  return segments.join("/");
};

const decodeUtf8 = (value: Buffer) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    return null;
  }
};

export const videoStreamImportSourceToken = (objectKey: string) => {
  const normalized = normalizeVideoObjectKey(objectKey);
  return normalized ? Buffer.from(normalized, "utf8").toString("base64url") : null;
};

export const videoStreamImportObjectKey = (token: string | null | undefined) => {
  const normalizedToken = token?.trim() ?? "";
  if (
    !normalizedToken ||
    normalizedToken.length > MAX_SOURCE_TOKEN_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(normalizedToken)
  ) {
    return null;
  }

  const decodedBuffer = Buffer.from(normalizedToken, "base64url");
  const decoded = decodeUtf8(decodedBuffer);
  if (!decoded || decodedBuffer.toString("base64url") !== normalizedToken) return null;

  return normalizeVideoObjectKey(decoded);
};

export const videoStreamImportSourceUrl = (
  objectKey: string,
  options: VideoStreamImportUrlOptions = {},
) => {
  const token = videoStreamImportSourceToken(objectKey);
  if (!token) return null;

  const configuredBaseUrl = Object.hasOwn(options, "baseUrl") ? options.baseUrl : process.env.BASE;
  const baseUrl = parsePublicHttpOrigin(configuredBaseUrl, {
    productionRuntime: options.productionRuntime,
  });

  return baseUrl ? `${baseUrl}${SOURCE_PATH_PREFIX}${token}` : null;
};
