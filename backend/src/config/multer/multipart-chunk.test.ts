import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import express from "express";
import { createMultipartChunkMiddleware } from "./multipart-chunk";

const FIVE_MIB = 5 * 1024 * 1024;

type MultipartRequestOptions = {
  chunkSize: number;
  includeExtraField?: boolean;
};

const requestMultipartChunk = async ({
  chunkSize,
  includeExtraField = false,
}: MultipartRequestOptions) => {
  const app = express();
  app.post("/part", createMultipartChunkMiddleware({ maxFileSizeMb: 5 }), (request, response) =>
    response.status(200).json({ size: request.file?.size }),
  );

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  try {
    const address = server.address() as AddressInfo;
    const body = new FormData();
    body.append("uploadSessionId", "session");
    body.append("partNumber", "1");
    if (includeExtraField) body.append("unexpected", "value");
    body.append("chunk", new Blob([new Uint8Array(chunkSize)], { type: "video/mp4" }), "part.mp4");

    return await fetch(`http://127.0.0.1:${address.port}/part`, {
      body,
      method: "POST",
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((serverError) => (serverError ? reject(serverError) : resolve()));
    });
  }
};

describe("multipart chunk middleware", () => {
  it("aceita as duas fields e um chunk exatamente no limite anunciado", async () => {
    const response = await requestMultipartChunk({ chunkSize: FIVE_MIB });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { size: FIVE_MIB });
  });

  it("rejeita chunk que ultrapassa o limite em um byte", async () => {
    const response = await requestMultipartChunk({ chunkSize: FIVE_MIB + 1 });
    const payload = (await response.json()) as { code?: string };

    assert.equal(response.status, 400);
    assert.equal(payload.code, "upload_error");
  });

  it("rejeita field adicional alem do contrato multipart", async () => {
    const response = await requestMultipartChunk({
      chunkSize: 128,
      includeExtraField: true,
    });
    const payload = (await response.json()) as { code?: string };

    assert.equal(response.status, 400);
    assert.equal(payload.code, "upload_error");
  });
});
