import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import {
  abortPublicMultipartUpload,
  completePublicMultipartUpload,
  createPublicMultipartUpload,
  PUBLIC_MULTIPART_CHUNK_BYTES,
  PublicMultipartValidationError,
  uploadPublicMultipartPart,
} from "./public-multipart";
import { S3 } from "./s3";

const TEST_ENV = {
  CLOUDFLARE_R2_ACCESS_KEY_ID: "test-access-key",
  CLOUDFLARE_R2_ACCESS_KEY_SECRET: "test-secret-key",
  CLOUDFLARE_R2_ENDPOINT: "https://example.invalid",
  CLOUDFLARE_R2_PUBLIC_BUCKET_NAME: "test-bucket",
  JWT_SECRET_KEY: "task-159-public-multipart-test-secret",
} as const;

const previousEnvironment = Object.fromEntries(
  Object.keys(TEST_ENV).map((key) => [key, process.env[key]]),
);

const mp4Chunk = () => {
  const chunk = Buffer.alloc(PUBLIC_MULTIPART_CHUNK_BYTES);
  chunk.writeUInt32BE(24, 0);
  chunk.write("ftyp", 4, "ascii");
  chunk.write("isom", 8, "ascii");
  chunk.writeUInt32BE(0, 12);
  chunk.write("isom", 16, "ascii");
  chunk.write("mp42", 20, "ascii");
  return chunk;
};

before(() => {
  Object.assign(process.env, TEST_ENV);
});

after(() => {
  for (const [key, value] of Object.entries(previousEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  mock.restoreAll();
});

describe("public multipart session binding", () => {
  it("vincula sessão e partes ao usuário/recurso e valida assinatura", async () => {
    mock.method(S3, "send", async (command: object) => {
      const commandName = command.constructor.name;
      if (commandName === "CreateMultipartUploadCommand") return { UploadId: "upload-1" };
      if (commandName === "UploadPartCommand") return { ETag: '"etag-1"' };
      return {};
    });

    const context = { resourceId: "ansiedade", scope: "community_post_media", userId: "user-1" };
    const session = await createPublicMultipartUpload({
      ...context,
      key: "posts/media/test.mp4",
      mimeType: "video/mp4",
      size: PUBLIC_MULTIPART_CHUNK_BYTES,
      ttlSeconds: 600,
    });

    await assert.rejects(
      uploadPublicMultipartPart({
        ...context,
        chunk: mp4Chunk(),
        partNumber: 1,
        sessionId: session.sessionId,
        userId: "user-2",
      }),
      (error: unknown) =>
        error instanceof PublicMultipartValidationError && error.reason === "session",
    );
    await assert.rejects(
      uploadPublicMultipartPart({
        ...context,
        chunk: mp4Chunk(),
        partNumber: 1,
        resourceId: "outra-comunidade",
        sessionId: session.sessionId,
      }),
      (error: unknown) =>
        error instanceof PublicMultipartValidationError && error.reason === "session",
    );
    await assert.rejects(
      uploadPublicMultipartPart({
        ...context,
        chunk: Buffer.alloc(PUBLIC_MULTIPART_CHUNK_BYTES),
        partNumber: 1,
        sessionId: session.sessionId,
        validateFirstPartSignature: true,
      }),
      (error: unknown) =>
        error instanceof PublicMultipartValidationError && error.reason === "file_signature",
    );

    const part = await uploadPublicMultipartPart({
      ...context,
      chunk: mp4Chunk(),
      partNumber: 1,
      sessionId: session.sessionId,
      validateFirstPartSignature: true,
    });

    await assert.rejects(
      completePublicMultipartUpload({ ...context, parts: [], sessionId: session.sessionId }),
      (error: unknown) =>
        error instanceof PublicMultipartValidationError && error.reason === "parts",
    );
    await completePublicMultipartUpload({
      ...context,
      parts: [{ partId: part.partId, partNumber: 1 }],
      sessionId: session.sessionId,
    });
    await assert.rejects(
      abortPublicMultipartUpload({
        ...context,
        resourceId: "outra-comunidade",
        sessionId: session.sessionId,
      }),
      (error: unknown) =>
        error instanceof PublicMultipartValidationError && error.reason === "session",
    );
  });
});
