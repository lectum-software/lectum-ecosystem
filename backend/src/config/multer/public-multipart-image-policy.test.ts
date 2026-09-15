import assert from "node:assert/strict";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import {
  abortPublicMultipartUpload,
  completePublicMultipartUpload,
  inspectPublicMultipartUploadSession,
  PublicMultipartValidationError,
  uploadPublicMultipartPart,
} from "./public-multipart";

const previousSecret = process.env.JWT_SECRET_KEY;
const previousEndpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
const secret = randomBytes(32).toString("hex");
const context = {
  resourceId: "local-resource",
  scope: "community_post_media",
  userId: "local-user",
};

before(() => {
  process.env.JWT_SECRET_KEY = secret;
  // O cancelamento sem provider configurado deve continuar seguro e sem rede.
  delete process.env.CLOUDFLARE_R2_ENDPOINT;
});

after(() => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET_KEY;
  else process.env.JWT_SECRET_KEY = previousSecret;
  if (previousEndpoint === undefined) delete process.env.CLOUDFLARE_R2_ENDPOINT;
  else process.env.CLOUDFLARE_R2_ENDPOINT = previousEndpoint;
});

const legacySession = () => {
  // Fixture local do contrato legado, criptografada de verdade. Não cria upload
  // nem simula resposta do R2 e não contém qualquer identificador publicado.
  const payload = {
    ...context,
    chunkSize: 5 * 1024 * 1024,
    exp: Math.floor(Date.now() / 1000) + 600,
    key: "posts/media/local-video.mp4",
    kind: "public_r2_multipart_session",
    mimeType: "video/mp4",
    size: 24,
    uploadId: "local-upload",
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
};

describe("sessões R2 de vídeo anteriores ao deploy", () => {
  it("recusa novas partes antes de qualquer escrita no provider", async () => {
    await assert.rejects(
      uploadPublicMultipartPart({
        ...context,
        sessionId: legacySession(),
        partNumber: 1,
        chunk: Buffer.alloc(24),
      }),
      (error: unknown) =>
        error instanceof PublicMultipartValidationError && error.reason === "request",
    );
  });

  it("recusa completar vídeo legado mesmo com sessão válida", async () => {
    await assert.rejects(
      completePublicMultipartUpload({ ...context, sessionId: legacySession(), parts: [] }),
      (error: unknown) =>
        error instanceof PublicMultipartValidationError && error.reason === "request",
    );
  });

  it("mantém inspeção e cancelamento, sem liberar sessão de outro usuário", async () => {
    const sessionId = legacySession();
    assert.equal(
      inspectPublicMultipartUploadSession({ ...context, sessionId, operation: "part" }).mimeType,
      "video/mp4",
    );
    await assert.rejects(
      abortPublicMultipartUpload({ ...context, sessionId, userId: "different-local-user" }),
      (error: unknown) =>
        error instanceof PublicMultipartValidationError && error.reason === "session",
    );
    await assert.doesNotReject(abortPublicMultipartUpload({ ...context, sessionId }));
  });
});
