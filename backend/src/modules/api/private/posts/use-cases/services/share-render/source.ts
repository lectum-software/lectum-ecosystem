import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { streamToBuffer } from "@/config/multer/buffer";
import { isR2Configured, PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { publicFileKeyFromUrl } from "@/utils/public-origin";

const PUBLIC_FILE_PATH_PREFIX = "/public/files/";
const SHARE_RENDER_ALLOWED_SOURCE_PREFIXES = ["posts/media/"] as const;

const MIME_BY_EXTENSION: Record<string, string> = {
  m4v: "video/mp4",
  mov: "video/quicktime",
  mp4: "video/mp4",
  webm: "video/webm",
};

export class ShareRenderSourceUnavailableError extends Error {
  constructor() {
    super("SHARE_RENDER_SOURCE_UNAVAILABLE");
    this.name = "ShareRenderSourceUnavailableError";
  }
}

export class ShareRenderSourceTooLargeError extends Error {
  constructor() {
    super("SHARE_RENDER_SOURCE_TOO_LARGE");
    this.name = "ShareRenderSourceTooLargeError";
  }
}

const hasControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const normalizePublicObjectKey = (key: string) => {
  const segments = key.split("/");
  if (
    !key ||
    key.length > 1_024 ||
    hasControlCharacter(key) ||
    key.includes("\\") ||
    !segments.every((segment) => segment && segment !== "." && segment !== "..")
  ) {
    return null;
  }

  return segments.join("/");
};

const fallbackPublicFileKeyFromUrl = (value: string | null | undefined) => {
  const raw = value?.trim();
  if (!raw || raw.length > 4_096 || raw.startsWith("//") || raw.includes("\\")) return null;

  try {
    const url = new URL(raw, "https://lectum.invalid");
    if (url.username || url.password || url.search || url.hash) return null;
    if (!url.pathname.startsWith(PUBLIC_FILE_PATH_PREFIX)) return null;

    const key = normalizePublicObjectKey(
      decodeURIComponent(url.pathname.slice(PUBLIC_FILE_PATH_PREFIX.length)),
    );
    if (!key || !SHARE_RENDER_ALLOWED_SOURCE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      return null;
    }

    return key;
  } catch {
    return null;
  }
};

export const shareRenderSourceKeyFromUrl = (value: string | null | undefined) =>
  publicFileKeyFromUrl(value, SHARE_RENDER_ALLOWED_SOURCE_PREFIXES) ??
  fallbackPublicFileKeyFromUrl(value);

const inferContentType = (key: string, contentType?: string | null) => {
  const normalizedContentType = contentType?.trim().toLowerCase().split(";", 1)[0] ?? "";
  if (normalizedContentType.startsWith("video/")) return normalizedContentType;

  const extension = key.toLowerCase().split(".").pop() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "video/mp4";
};

const bufferFromObjectBody = async (body: unknown, signal?: AbortSignal) => {
  if (!body) throw new ShareRenderSourceUnavailableError();
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);

  const maybeTransformable = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
  if (typeof maybeTransformable.transformToByteArray === "function") {
    return Buffer.from(await maybeTransformable.transformToByteArray());
  }

  return streamToBuffer(body as NodeJS.ReadableStream, signal);
};

export const loadShareRenderSource = async (
  mediaUrl: string,
  options: { maxBytes: number; signal?: AbortSignal },
) => {
  const key = shareRenderSourceKeyFromUrl(mediaUrl);
  if (!key || !isR2Configured()) throw new ShareRenderSourceUnavailableError();

  const head = await S3.send(
    new HeadObjectCommand({
      Bucket: PUBLIC_BUCKET,
      Key: key,
    }),
    { abortSignal: options.signal },
  ).catch(() => null);

  if (!head) throw new ShareRenderSourceUnavailableError();
  if (head.ContentLength && head.ContentLength > options.maxBytes) {
    throw new ShareRenderSourceTooLargeError();
  }

  const object = await S3.send(
    new GetObjectCommand({
      Bucket: PUBLIC_BUCKET,
      Key: key,
    }),
    { abortSignal: options.signal },
  ).catch(() => null);

  if (!object?.Body) throw new ShareRenderSourceUnavailableError();

  const buffer = await bufferFromObjectBody(object.Body, options.signal);
  if (buffer.length === 0) throw new ShareRenderSourceUnavailableError();
  if (buffer.length > options.maxBytes) throw new ShareRenderSourceTooLargeError();

  return {
    buffer,
    contentType: inferContentType(key, object.ContentType ?? head.ContentType),
    key,
  };
};
