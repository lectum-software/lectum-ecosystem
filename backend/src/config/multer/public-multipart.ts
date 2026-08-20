import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import {
  AbortMultipartUploadCommand,
  type CompletedPart,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getJwtSecret } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import { matchesDeclaredFileType } from "./file-signature";
import { isR2Configured, PUBLIC_BUCKET, S3 } from "./s3";

export const PUBLIC_MULTIPART_CHUNK_BYTES = 5 * 1024 * 1024;

const PUBLIC_MULTIPART_MAX_PARTS = 10_000;
const MIN_TTL_SECONDS = 5 * 60;
const MAX_TTL_SECONDS = 4 * 60 * 60;

type MultipartContext = {
  resourceId: string;
  scope: string;
  userId: string;
};

type MultipartSessionPayload = MultipartContext & {
  chunkSize: number;
  exp: number;
  key: string;
  kind: "public_r2_multipart_session";
  mimeType: string;
  size: number;
  uploadId: string;
};

type MultipartPartPayload = MultipartContext & {
  etag: string;
  exp: number;
  key: string;
  kind: "public_r2_multipart_part";
  partNumber: number;
  uploadId: string;
};

export type PublicMultipartPartReference = {
  partId?: string;
  partNumber: number;
  partToken?: string;
};

export type PublicMultipartValidationReason =
  | "file_signature"
  | "part_size"
  | "parts"
  | "request"
  | "session";

export class PublicMultipartValidationError extends Error {
  public readonly reason: PublicMultipartValidationReason;

  constructor(reason: PublicMultipartValidationReason = "request") {
    super("PUBLIC_MULTIPART_INVALID");
    this.name = "PublicMultipartValidationError";
    this.reason = reason;
  }
}

export class PublicMultipartInfrastructureError extends Error {
  constructor() {
    super("PUBLIC_MULTIPART_UNAVAILABLE");
    this.name = "PublicMultipartInfrastructureError";
  }
}

const isObjectPayload = (payload: unknown): payload is Record<string, unknown> =>
  typeof payload === "object" && payload !== null && !Array.isArray(payload);

const hasValidContext = (payload: Record<string, unknown>) =>
  typeof payload.resourceId === "string" &&
  typeof payload.scope === "string" &&
  typeof payload.userId === "string";

const isSessionPayload = (payload: unknown): payload is MultipartSessionPayload =>
  isObjectPayload(payload) &&
  payload.kind === "public_r2_multipart_session" &&
  hasValidContext(payload) &&
  typeof payload.exp === "number" &&
  typeof payload.uploadId === "string" &&
  typeof payload.key === "string" &&
  typeof payload.mimeType === "string" &&
  typeof payload.size === "number" &&
  typeof payload.chunkSize === "number";

const isPartPayload = (payload: unknown): payload is MultipartPartPayload =>
  isObjectPayload(payload) &&
  payload.kind === "public_r2_multipart_part" &&
  hasValidContext(payload) &&
  typeof payload.exp === "number" &&
  typeof payload.uploadId === "string" &&
  typeof payload.key === "string" &&
  typeof payload.partNumber === "number" &&
  typeof payload.etag === "string";

const getMultipartEncryptionKey = () => createHash("sha256").update(getJwtSecret()).digest();
const encodeTokenPart = (buffer: Buffer) => buffer.toString("base64url");

const decodeTokenPart = (value: string) => {
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
};

const encryptPayload = (payload: MultipartPartPayload | MultipartSessionPayload) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getMultipartEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);

  return [
    encodeTokenPart(iv),
    encodeTokenPart(cipher.getAuthTag()),
    encodeTokenPart(encrypted),
  ].join(".");
};

const decryptPayload = (token: string) => {
  const [ivValue, tagValue, encryptedValue] = token.split(".");
  if (!ivValue || !tagValue || !encryptedValue) return null;

  const iv = decodeTokenPart(ivValue);
  const tag = decodeTokenPart(tagValue);
  const encrypted = decodeTokenPart(encryptedValue);
  if (!iv || !tag || !encrypted) return null;

  try {
    const decipher = createDecipheriv("aes-256-gcm", getMultipartEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
      "utf8",
    );

    return JSON.parse(decrypted) as unknown;
  } catch {
    return null;
  }
};

const isFresh = (payload: { exp: number }) => payload.exp >= Math.floor(Date.now() / 1000);

const contextMatches = (payload: MultipartContext, expected: MultipartContext) =>
  payload.resourceId === expected.resourceId &&
  payload.scope === expected.scope &&
  payload.userId === expected.userId;

const readSession = (sessionId: string, context: MultipartContext) => {
  const payload = decryptPayload(sessionId);

  if (!isSessionPayload(payload) || !isFresh(payload) || !contextMatches(payload, context)) {
    throw new PublicMultipartValidationError("session");
  }

  return payload;
};

const readPart = (partId: string) => {
  const payload = decryptPayload(partId);
  return isPartPayload(payload) && isFresh(payload) ? payload : null;
};

export const getPublicMultipartPartCount = (
  size: number,
  chunkSize = PUBLIC_MULTIPART_CHUNK_BYTES,
) => (Number.isInteger(size) && size > 0 ? Math.ceil(size / chunkSize) : 0);

export const getPublicMultipartExpectedPartSize = (
  size: number,
  partNumber: number,
  chunkSize = PUBLIC_MULTIPART_CHUNK_BYTES,
) => {
  const partCount = getPublicMultipartPartCount(size, chunkSize);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > partCount) return null;

  return partNumber === partCount ? size - chunkSize * (partCount - 1) : chunkSize;
};

const resolvePartId = (part: PublicMultipartPartReference) =>
  (part.partId || part.partToken || "").trim();

const toCompletedParts = (
  session: MultipartSessionPayload,
  parts: PublicMultipartPartReference[],
) => {
  const expectedPartCount = getPublicMultipartPartCount(session.size, session.chunkSize);
  if (parts.length !== expectedPartCount || expectedPartCount > PUBLIC_MULTIPART_MAX_PARTS) {
    throw new PublicMultipartValidationError("parts");
  }

  const verifiedParts = parts.map((reference) => {
    const part = readPart(resolvePartId(reference));
    if (
      !part ||
      reference.partNumber !== part.partNumber ||
      !contextMatches(part, session) ||
      part.uploadId !== session.uploadId ||
      part.key !== session.key ||
      part.exp !== session.exp
    ) {
      throw new PublicMultipartValidationError("parts");
    }

    return part;
  });

  const uniquePartNumbers = new Set(verifiedParts.map((part) => part.partNumber));
  if (uniquePartNumbers.size !== expectedPartCount) {
    throw new PublicMultipartValidationError("parts");
  }

  const sortedParts = [...verifiedParts].sort((left, right) => left.partNumber - right.partNumber);
  if (sortedParts.some((part, index) => part.partNumber !== index + 1)) {
    throw new PublicMultipartValidationError("parts");
  }

  return sortedParts.map(
    (part): CompletedPart => ({ ETag: part.etag, PartNumber: part.partNumber }),
  );
};

const infrastructureFailure = () => new PublicMultipartInfrastructureError();

export const createPublicMultipartUpload = async (
  input: MultipartContext & {
    key: string;
    mimeType: string;
    size: number;
    ttlSeconds: number;
  },
) => {
  if (!isR2Configured()) throw infrastructureFailure();

  const partCount = getPublicMultipartPartCount(input.size);
  if (partCount < 1 || partCount > PUBLIC_MULTIPART_MAX_PARTS) {
    throw new PublicMultipartValidationError("request");
  }

  try {
    const started = await S3.send(
      new CreateMultipartUploadCommand({
        Bucket: PUBLIC_BUCKET,
        CacheControl: "public, max-age=31536000, immutable",
        ContentType: input.mimeType,
        Key: input.key,
      }),
    );
    if (!started.UploadId) throw infrastructureFailure();

    const ttlSeconds = Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, input.ttlSeconds));
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const sessionId = encryptPayload({
      chunkSize: PUBLIC_MULTIPART_CHUNK_BYTES,
      exp,
      key: input.key,
      kind: "public_r2_multipart_session",
      mimeType: input.mimeType,
      resourceId: input.resourceId,
      scope: input.scope,
      size: input.size,
      uploadId: started.UploadId,
      userId: input.userId,
    });

    return { chunkSize: PUBLIC_MULTIPART_CHUNK_BYTES, sessionId };
  } catch (uploadError) {
    if (uploadError instanceof PublicMultipartValidationError) throw uploadError;
    throw infrastructureFailure();
  }
};

export const uploadPublicMultipartPart = async (
  input: MultipartContext & {
    chunk: Buffer;
    partNumber: number;
    sessionId: string;
    validateFirstPartSignature?: boolean;
  },
) => {
  const session = readSession(input.sessionId, input);
  const expectedSize = getPublicMultipartExpectedPartSize(
    session.size,
    input.partNumber,
    session.chunkSize,
  );

  if (!expectedSize || input.chunk.length !== expectedSize) {
    throw new PublicMultipartValidationError("part_size");
  }
  if (
    input.validateFirstPartSignature &&
    input.partNumber === 1 &&
    !matchesDeclaredFileType(input.chunk, session.mimeType)
  ) {
    throw new PublicMultipartValidationError("file_signature");
  }

  try {
    const uploaded = await S3.send(
      new UploadPartCommand({
        Body: input.chunk,
        Bucket: PUBLIC_BUCKET,
        ContentLength: input.chunk.length,
        Key: session.key,
        PartNumber: input.partNumber,
        UploadId: session.uploadId,
      }),
    );
    if (!uploaded.ETag) throw infrastructureFailure();

    return {
      partId: encryptPayload({
        etag: uploaded.ETag,
        exp: session.exp,
        key: session.key,
        kind: "public_r2_multipart_part",
        partNumber: input.partNumber,
        resourceId: session.resourceId,
        scope: session.scope,
        uploadId: session.uploadId,
        userId: session.userId,
      }),
      partNumber: input.partNumber,
    };
  } catch (uploadError) {
    if (uploadError instanceof PublicMultipartValidationError) throw uploadError;
    throw infrastructureFailure();
  }
};

export const completePublicMultipartUpload = async (
  input: MultipartContext & {
    parts: PublicMultipartPartReference[];
    sessionId: string;
  },
) => {
  const session = readSession(input.sessionId, input);
  const completedParts = toCompletedParts(session, input.parts);

  try {
    await S3.send(
      new CompleteMultipartUploadCommand({
        Bucket: PUBLIC_BUCKET,
        Key: session.key,
        MultipartUpload: { Parts: completedParts },
        UploadId: session.uploadId,
      }),
    );

    return { key: session.key, mimeType: session.mimeType, size: session.size };
  } catch {
    throw infrastructureFailure();
  }
};

export const abortPublicMultipartUpload = async (
  input: MultipartContext & { sessionId: string },
) => {
  const session = readSession(input.sessionId, input);
  if (!isR2Configured()) return;

  try {
    await S3.send(
      new AbortMultipartUploadCommand({
        Bucket: PUBLIC_BUCKET,
        Key: session.key,
        UploadId: session.uploadId,
      }),
    );
  } catch {
    throw infrastructureFailure();
  }
};
