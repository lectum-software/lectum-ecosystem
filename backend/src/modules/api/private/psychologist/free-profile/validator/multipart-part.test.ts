import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import express from "express";
import { createMultipartChunkMiddleware } from "@/config/multer/multipart-chunk";
import { videoMultipartPartValidator } from ".";

const requestValidatedPart = async (sessionId: string) => {
  const app = express();
  app.post(
    "/part",
    createMultipartChunkMiddleware({ maxFileSizeMb: 5 }),
    videoMultipartPartValidator,
    (request, response) =>
      response.status(200).json({
        body: request.body,
        size: request.file?.size,
        validatedBody: request.b,
      }),
  );

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  try {
    const address = server.address() as AddressInfo;
    const body = new FormData();
    body.append("uploadSessionId", sessionId);
    body.append("partNumber", "1");
    body.append("chunk", new Blob([new Uint8Array(128)], { type: "video/mp4" }), "part.mp4");

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

describe("profile video multipart part validator", () => {
  it("preserva a sessao no alias validado usado pelo controller", async () => {
    const sessionId = `iv.${"a".repeat(1024)}.payload`;
    const response = await requestValidatedPart(sessionId);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      body: {},
      size: 128,
      validatedBody: { partNumber: 1, uploadSessionId: sessionId },
    });
  });
});
