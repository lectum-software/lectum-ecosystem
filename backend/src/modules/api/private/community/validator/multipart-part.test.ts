import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import express from "express";
import { createMultipartChunkMiddleware } from "@/config/multer/multipart-chunk";
import { postMediaMultipartPartValidator } from ".";

const requestValidatedPart = async (sessionId: string) => {
  const app = express();
  app.post(
    "/:slug/part",
    createMultipartChunkMiddleware({ maxFileSizeMb: 5 }),
    postMediaMultipartPartValidator,
    (request, response) =>
      response.status(200).json({
        body: request.body,
        params: request.p,
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

    return await fetch(`http://127.0.0.1:${address.port}/ANSIEDADE/part`, {
      body,
      method: "POST",
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((serverError) => (serverError ? reject(serverError) : resolve()));
    });
  }
};

describe("community post media multipart part validator", () => {
  it("preserva sessao, parte e slug nos aliases validados", async () => {
    const sessionId = `iv.${"a".repeat(1024)}.payload`;
    const response = await requestValidatedPart(sessionId);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      body: {},
      params: { slug: "ansiedade" },
      size: 128,
      validatedBody: { partNumber: 1, uploadSessionId: sessionId },
    });
  });
});
