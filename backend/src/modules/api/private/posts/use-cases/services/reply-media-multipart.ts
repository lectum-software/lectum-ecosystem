import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import {
  AbortMultipartUploadCommand,
  type CompletedPart,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { createId } from "@paralleldrive/cuid2";
import { matchesDeclaredFileType } from "@/config/multer/file-signature";
import { isR2Configured, PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { error, msg } from "@/helpers/translate";
import { getJwtSecret } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import type {
  IPostAbortReplyMediaMultipartDTO,
  IPostCompleteReplyMediaMultipartDTO,
  IPostInitiateReplyMediaMultipartDTO,
  IPostUploadReplyMediaMultipartPartDTO,
  PostReplyMediaType,
} from "../../DTOs/IPostDTO";
import { PostRepository } from "../../repositories/PostRepository";
import {
  type AuthenticatedPostShowDTO,
  ensureCommunityActor,
  mediaNotAllowed,
  mediaTypeFromMime,
  notFound,
  publicFileUrl,
} from "./post-support";

export const POST_REPLY_MEDIA_UPLOAD_LIMIT_MB = 200;
export const POST_REPLY_MEDIA_MULTIPART_CHUNK_BYTES = 8 * 1024 * 1024;
export const POST_REPLY_MEDIA_MULTIPART_CHUNK_LIMIT_MB = 10;

const POST_REPLY_MEDIA_UPLOAD_LIMIT_BYTES = POST_REPLY_MEDIA_UPLOAD_LIMIT_MB * 1024 * 1024;
const POST_REPLY_MEDIA_MULTIPART_MAX_PARTS = 10_000;
const POST_REPLY_MEDIA_MULTIPART_TTL_SECONDS = 30 * 60;

const ALLOWED_REPLY_MEDIA_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const REPLY_MEDIA_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

type MultipartSessionPayload = {
  chunkSize: number;
  exp: number;
  key: string;
  kind: "post_reply_media_upload";
  mediaType: PostReplyMediaType;
  mimeType: string;
  postId: string;
  size: number;
  uploadId: string;
  userId: string;
};

type MultipartPartPayload = {
  etag: string;
  exp: number;
  key: string;
  kind: "post_reply_media_upload_part";
  partNumber: number;
  postId: string;
  uploadId: string;
  userId: string;
};

const invalidReplyMedia = () => ({
  status: 400,
  ...error("post_reply_media_invalid", {}),
});

const uploadUnavailable = () => ({
  status: 503,
  ...error("upload_error", {}),
});

const fileLimitExceeded = () => ({
  status: 400,
  ...error("exceeded_file_limit", { limit: POST_REPLY_MEDIA_UPLOAD_LIMIT_MB }),
});

const unexpectedType = (mimeType: string) => ({
  status: 400,
  ...error("unexpected_type_file", { type: mimeType.split("/")[1]?.toUpperCase() || "" }),
});

const isObjectPayload = (payload: unknown): payload is Record<string, unknown> =>
  typeof payload === "object" && payload !== null;

const isSessionPayload = (payload: unknown): payload is MultipartSessionPayload =>
  isObjectPayload(payload) &&
  payload.kind === "post_reply_media_upload" &&
  typeof payload.exp === "number" &&
  typeof payload.postId === "string" &&
  typeof payload.userId === "string" &&
  typeof payload.uploadId === "string" &&
  typeof payload.key === "string" &&
  typeof payload.mimeType === "string" &&
  (payload.mediaType === "image" || payload.mediaType === "video") &&
  typeof payload.size === "number" &&
  typeof payload.chunkSize === "number";

const isPartPayload = (payload: unknown): payload is MultipartPartPayload =>
  isObjectPayload(payload) &&
  payload.kind === "post_reply_media_upload_part" &&
  typeof payload.exp === "number" &&
  typeof payload.postId === "string" &&
  typeof payload.userId === "string" &&
  typeof payload.uploadId === "string" &&
  typeof payload.key === "string" &&
  typeof payload.partNumber === "number" &&
  typeof payload.etag === "string";

const getMultipartTokenKey = () => createHash("sha256").update(getJwtSecret()).digest();
const encodeTokenPart = (buffer: Buffer) => buffer.toString("base64url");

const decodeTokenPart = (value: string) => {
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
};

const encryptMultipartToken = (payload: MultipartSessionPayload | MultipartPartPayload) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getMultipartTokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);

  return [
    encodeTokenPart(iv),
    encodeTokenPart(cipher.getAuthTag()),
    encodeTokenPart(encrypted),
  ].join(".");
};

const decryptMultipartToken = (token: string) => {
  const [ivValue, tagValue, encryptedValue] = token.split(".");
  if (!ivValue || !tagValue || !encryptedValue) return null;

  const iv = decodeTokenPart(ivValue);
  const tag = decodeTokenPart(tagValue);
  const encrypted = decodeTokenPart(encryptedValue);
  if (!iv || !tag || !encrypted) return null;

  try {
    const decipher = createDecipheriv("aes-256-gcm", getMultipartTokenKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
      "utf8",
    );

    return JSON.parse(decrypted) as unknown;
  } catch {
    return null;
  }
};

const tokenExpiration = () =>
  Math.floor(Date.now() / 1000) + POST_REPLY_MEDIA_MULTIPART_TTL_SECONDS;

const isFreshToken = (payload: { exp: number }) => payload.exp >= Math.floor(Date.now() / 1000);

const signSessionToken = (payload: Omit<MultipartSessionPayload, "exp">) =>
  encryptMultipartToken({ ...payload, exp: tokenExpiration() });

const signPartToken = (payload: Omit<MultipartPartPayload, "exp">) =>
  encryptMultipartToken({ ...payload, exp: tokenExpiration() });

const verifySessionToken = (token: string) => {
  const payload = decryptMultipartToken(token);

  return isSessionPayload(payload) && isFreshToken(payload) ? payload : null;
};

const verifyPartToken = (token: string) => {
  const payload = decryptMultipartToken(token);

  return isPartPayload(payload) && isFreshToken(payload) ? payload : null;
};

const ensureReplyMediaUploadAllowed = async (data: AuthenticatedPostShowDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const [postExists, canAttach] = await Promise.all([
    repository.exists(data.p.id),
    repository.canAttachReplyMedia(data.auth.id!),
  ]);

  if (!postExists) return notFound();
  if (!canAttach) return mediaNotAllowed();

  return null;
};

const createReplyMediaKey = (mimeType: string) => {
  const extension = REPLY_MEDIA_EXTENSIONS[mimeType];
  if (!extension) return null;

  return `posts/media/${createId()}.${extension}`;
};

const normalizeSessionToken = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const parsePartNumber = (value: unknown) => {
  const partNumber = Number(value);

  return Number.isInteger(partNumber) &&
    partNumber >= 1 &&
    partNumber <= POST_REPLY_MEDIA_MULTIPART_MAX_PARTS
    ? partNumber
    : null;
};

const isSessionOwner = (session: MultipartSessionPayload, data: AuthenticatedPostShowDTO) =>
  session.postId === data.p.id && session.userId === data.auth.id;

const validatePartForSession = (part: MultipartPartPayload, session: MultipartSessionPayload) =>
  part.postId === session.postId &&
  part.userId === session.userId &&
  part.uploadId === session.uploadId &&
  part.key === session.key;

const verifyCompleteParts = (session: MultipartSessionPayload, parts: { partToken: string }[]) => {
  const expectedParts = Math.ceil(session.size / session.chunkSize);
  if (parts.length !== expectedParts) return null;

  const completedParts = parts
    .map((part) => verifyPartToken(part.partToken))
    .filter((part): part is MultipartPartPayload => Boolean(part));

  if (completedParts.length !== expectedParts) return null;
  if (completedParts.some((part) => !validatePartForSession(part, session))) return null;

  const uniquePartNumbers = new Set(completedParts.map((part) => part.partNumber));
  if (uniquePartNumbers.size !== expectedParts) return null;

  const sortedParts = [...completedParts].sort((a, b) => a.partNumber - b.partNumber);
  if (sortedParts.some((part, index) => part.partNumber !== index + 1)) return null;

  return sortedParts.map(
    (part): CompletedPart => ({
      ETag: part.etag,
      PartNumber: part.partNumber,
    }),
  );
};

export const initiateReplyMediaMultipartUpload = async (
  data: IPostInitiateReplyMediaMultipartDTO,
) => {
  const unauthorized = await ensureReplyMediaUploadAllowed(data);
  if (unauthorized) return unauthorized;

  const mimeType = data.b.mimeType.trim().toLowerCase();
  const size = Number(data.b.size);
  const mediaType = mediaTypeFromMime(mimeType);

  if (!Number.isInteger(size) || size <= 0) return invalidReplyMedia();
  if (size > POST_REPLY_MEDIA_UPLOAD_LIMIT_BYTES) return fileLimitExceeded();
  if (!ALLOWED_REPLY_MEDIA_MIME_TYPES.has(mimeType) || !mediaType) return unexpectedType(mimeType);
  if (!isR2Configured()) return uploadUnavailable();

  const key = createReplyMediaKey(mimeType);
  if (!key) return invalidReplyMedia();

  try {
    const started = await S3.send(
      new CreateMultipartUploadCommand({
        Bucket: PUBLIC_BUCKET,
        CacheControl: "public, max-age=31536000, immutable",
        ContentType: mimeType,
        Key: key,
      }),
    );

    if (!started.UploadId) return uploadUnavailable();

    const sessionToken = signSessionToken({
      chunkSize: POST_REPLY_MEDIA_MULTIPART_CHUNK_BYTES,
      key,
      kind: "post_reply_media_upload",
      mediaType,
      mimeType,
      postId: data.p.id,
      size,
      uploadId: started.UploadId,
      userId: data.auth.id!,
    });

    return {
      status: 200,
      ...msg("post_reply_media_uploaded", {}),
      data: {
        chunk_size: POST_REPLY_MEDIA_MULTIPART_CHUNK_BYTES,
        max_file_size: POST_REPLY_MEDIA_UPLOAD_LIMIT_BYTES,
        upload_session_id: sessionToken,
      },
    };
  } catch {
    return uploadUnavailable();
  }
};

export const uploadReplyMediaMultipartPart = async (
  data: IPostUploadReplyMediaMultipartPartDTO,
) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const sessionToken = normalizeSessionToken(data.b.uploadSessionId);
  const session = verifySessionToken(sessionToken);
  const partNumber = parsePartNumber(data.b.partNumber);
  const chunk = data.file?.buffer;

  if (!session || !partNumber || !isSessionOwner(session, data) || !chunk?.length) {
    return invalidReplyMedia();
  }

  if (chunk.length > POST_REPLY_MEDIA_MULTIPART_CHUNK_LIMIT_MB * 1024 * 1024) {
    return invalidReplyMedia();
  }

  if (partNumber === 1 && !matchesDeclaredFileType(chunk, session.mimeType)) {
    return invalidReplyMedia();
  }

  try {
    const uploadedPart = await S3.send(
      new UploadPartCommand({
        Body: chunk,
        Bucket: PUBLIC_BUCKET,
        ContentLength: chunk.length,
        Key: session.key,
        PartNumber: partNumber,
        UploadId: session.uploadId,
      }),
    );

    if (!uploadedPart.ETag) return uploadUnavailable();

    const partToken = signPartToken({
      etag: uploadedPart.ETag,
      key: session.key,
      kind: "post_reply_media_upload_part",
      partNumber,
      postId: session.postId,
      uploadId: session.uploadId,
      userId: session.userId,
    });

    return {
      status: 200,
      ...msg("post_reply_media_uploaded", {}),
      data: {
        part_number: partNumber,
        part_token: partToken,
      },
    };
  } catch {
    return uploadUnavailable();
  }
};

export const completeReplyMediaMultipartUpload = async (
  data: IPostCompleteReplyMediaMultipartDTO,
) => {
  const unauthorized = await ensureReplyMediaUploadAllowed(data);
  if (unauthorized) return unauthorized;

  const session = verifySessionToken(normalizeSessionToken(data.b.uploadSessionId));
  if (!session || !isSessionOwner(session, data)) return invalidReplyMedia();

  const completedParts = verifyCompleteParts(session, data.b.parts);
  if (!completedParts?.length) return invalidReplyMedia();

  try {
    await S3.send(
      new CompleteMultipartUploadCommand({
        Bucket: PUBLIC_BUCKET,
        Key: session.key,
        MultipartUpload: { Parts: completedParts },
        UploadId: session.uploadId,
      }),
    );

    return {
      status: 200,
      ...msg("post_reply_media_uploaded", {}),
      data: {
        media_type: session.mediaType,
        media_url: publicFileUrl(session.key),
      },
    };
  } catch {
    return uploadUnavailable();
  }
};

export const abortReplyMediaMultipartUpload = async (data: IPostAbortReplyMediaMultipartDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const session = verifySessionToken(normalizeSessionToken(data.b.uploadSessionId));
  if (!session || !isSessionOwner(session, data)) return invalidReplyMedia();

  try {
    if (isR2Configured()) {
      await S3.send(
        new AbortMultipartUploadCommand({
          Bucket: PUBLIC_BUCKET,
          Key: session.key,
          UploadId: session.uploadId,
        }),
      );
    }
  } catch {
    // Abort best-effort: a falha nao deve expor detalhe tecnico ao cliente.
  }

  return {
    status: 200,
    ...msg("post_reply_media_uploaded", {}),
    data: { aborted: true },
  };
};
