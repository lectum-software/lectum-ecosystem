import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import express, { type ErrorRequestHandler } from "express";
import multer from "multer";
import { UploadValidationError } from "./errors";
import { matchesDeclaredFileType } from "./file-signature";
import { fileFilter } from "./fileFilter";
import { assertPublicImageMimeType, PUBLIC_IMAGE_MIME_TYPES } from "./public-image-policy";
import { createPublicMultipartUpload, PublicMultipartValidationError } from "./public-multipart";
import { createPublicUploadStorage } from "./storage";

const requestUpload = async (mimeType: string, storageOnly = false) => {
  const app = express();
  // O parser positivo usa memória real, não um provider simulado. O negativo
  // também exercita o storage R2 real diretamente, sem depender do fileFilter.
  app.post(
    "/image",
    (req, _res, next) => {
      req.allowed = ["image/*", "video/*", "application/octet-stream"];
      next();
    },
    multer({
      fileFilter: storageOnly ? undefined : fileFilter,
      limits: { fileSize: 1024 },
      storage: storageOnly ? createPublicUploadStorage() : multer.memoryStorage(),
    }).single("image"),
    (_req, res) => res.sendStatus(204),
  );
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    res.status(error instanceof UploadValidationError ? 400 : 500).json({
      rejected: error instanceof UploadValidationError,
    });
  };
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const form = new FormData();
    form.append("image", new Blob([new Uint8Array(24)], { type: mimeType }), "arquivo");
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}/image`,
      {
        body: form,
        method: "POST",
        signal: AbortSignal.timeout(5000),
      },
    );
    return { body: await response.text(), status: response.status };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

describe("R2 exclusivo para imagens", () => {
  it("mantém somente JPG, PNG e WebP, sem wildcard ou tipos de vídeo", () => {
    for (const mimeType of PUBLIC_IMAGE_MIME_TYPES) {
      assert.doesNotThrow(() => assertPublicImageMimeType(mimeType));
    }
    for (const mimeType of [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "application/octet-stream",
      "image/svg+xml",
      "image/*",
      "",
    ]) {
      assert.throws(() => assertPublicImageMimeType(mimeType), UploadValidationError);
    }
  });

  it("parser HTTP recusa vídeo mesmo quando a rota usa allowlist ampla", async () => {
    const result = await requestUpload("video/mp4");
    assert.equal(result.status, 400);
    assert.deepEqual(JSON.parse(result.body), { rejected: true });
  });

  it("storage HTTP recusa vídeo antes de consultar configuração, fila ou provider", async () => {
    const result = await requestUpload("video/quicktime", true);
    assert.equal(result.status, 400);
    assert.deepEqual(JSON.parse(result.body), { rejected: true });
  });

  it("parser preserva os tipos de imagem autorizados", async () => {
    for (const mimeType of PUBLIC_IMAGE_MIME_TYPES) {
      const result = await requestUpload(mimeType);
      assert.equal(result.status, 204);
    }
  });

  it("assinatura continua recusando MP4 renomeado como imagem", () => {
    const video = Buffer.alloc(24);
    video.writeUInt32BE(24);
    video.write("ftypisom", 4, "ascii");
    video.write("isommp42", 16, "ascii");
    assert.equal(matchesDeclaredFileType(video, "video/mp4"), true);
    for (const mimeType of PUBLIC_IMAGE_MIME_TYPES) {
      assert.equal(matchesDeclaredFileType(video, mimeType), false);
    }
  });

  it("multipart recusa provisionamento de vídeo antes do provider", async () => {
    await assert.rejects(
      createPublicMultipartUpload({
        key: "posts/media/arquivo.mp4",
        mimeType: "video/mp4",
        resourceId: "test-resource",
        scope: "community_post_media",
        size: 24,
        ttlSeconds: 600,
        userId: "test-user",
      }),
      (error: unknown) =>
        error instanceof PublicMultipartValidationError && error.reason === "request",
    );
  });
});
