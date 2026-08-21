import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, it } from "node:test";
import type { Request, Response } from "express";
import type multer from "multer";
import { createPublicUploadStorage } from "./storage";
import { createUploadConcurrencyGate } from "./upload-concurrency";

const createRequest = () => {
  const request = new EventEmitter() as Request;
  const response = new EventEmitter() as Response;
  Object.assign(request, {
    aborted: false,
    baseUrl: "/api/private/community",
    destroyed: false,
    readableEnded: false,
    res: response,
    uploadFeature: "posts",
  });
  Object.assign(response, { writableEnded: false });
  return request;
};

const createFile = (stream: PassThrough) =>
  ({
    buffer: Buffer.alloc(0),
    destination: "",
    encoding: "7bit",
    fieldname: "media",
    filename: "media.mp4",
    mimetype: "video/mp4",
    originalname: "media.mp4",
    path: "",
    size: 0,
    stream,
  }) satisfies Express.Multer.File;

const handleFile = (storage: multer.StorageEngine, request: Request, file: Express.Multer.File) =>
  new Promise<Error | null>((resolve) => {
    storage._handleFile(request, file, (storageError) => resolve(storageError));
  });

describe("public upload storage concurrency", () => {
  it("cancela a aquisicao enfileirada quando a requisicao e abortada", async () => {
    const gate = createUploadConcurrencyGate(1, 1);
    await gate.acquire();
    const storage = createPublicUploadStorage({
      acquire: gate.acquire,
      isConfigured: () => true,
      release: gate.release,
    });
    const request = createRequest();
    const stream = new PassThrough();
    const handled = handleFile(storage, request, createFile(stream));
    await Promise.resolve();

    Object.assign(request, { aborted: true, destroyed: true });
    request.emit("aborted");

    const storageError = await handled;
    assert.equal(storageError?.name, "AbortError");

    gate.release();
    await gate.acquire();
    gate.release();
  });
});
