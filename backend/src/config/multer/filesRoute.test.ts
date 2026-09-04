import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, describe, it } from "node:test";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import express from "express";
import { videoStreamImportSourceToken } from "@/utils/video-stream-import-source";
import { filesRoute } from "./filesRoute";
import { S3 } from "./s3";

describe("public source for Cloudflare Stream import", () => {
  const app = express();
  const mutableS3 = S3 as unknown as {
    send: (command: unknown) => Promise<unknown>;
  };
  const originalSend = mutableS3.send.bind(S3);
  let baseUrl = "";
  let server: ReturnType<typeof app.listen>;

  before(async () => {
    mutableS3.send = async (command) => {
      if (command instanceof HeadObjectCommand) {
        return {
          AcceptRanges: "bytes",
          ContentLength: 100,
          ContentType: command.input.Key?.endsWith(".jpg") ? "image/jpeg" : "video/mp4",
          ETag: '"etag"',
        };
      }
      if (command instanceof GetObjectCommand) {
        if (!command.input.Range) {
          return {
            AcceptRanges: "bytes",
            Body: Readable.from(Buffer.alloc(100, "x")),
            ContentLength: 100,
            ContentType: "video/mp4",
            ETag: '"etag"',
          };
        }
        return {
          AcceptRanges: "bytes",
          Body: Readable.from(Buffer.from("x")),
          ContentLength: 1,
          ContentRange: "bytes 0-0/100",
          ContentType: "video/mp4",
          ETag: '"etag"',
        };
      }
      throw new Error("UNEXPECTED_S3_COMMAND");
    };

    filesRoute(app);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address === "object");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    mutableS3.send = originalSend;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("responde HEAD sem cache e com o tamanho completo", async () => {
    const token = videoStreamImportSourceToken("psychologist/video/video.mp4");
    assert.ok(token);
    const response = await fetch(`${baseUrl}/public/video-stream-import/v1/${token}`, {
      method: "HEAD",
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("accept-ranges"), "bytes");
    assert.equal(response.headers.get("content-length"), "100");
    assert.equal(response.headers.get("content-range"), "bytes 0-99/100");
    assert.equal(response.headers.get("cdn-cache-control"), "no-store");
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(await response.text(), "");
  });

  it("preserva o contrato HEAD quando o CDN consulta a origem por GET", async () => {
    const token = videoStreamImportSourceToken("psychologist/video/video.mp4");
    assert.ok(token);
    const response = await fetch(`${baseUrl}/public/video-stream-import/v1/${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-length"), "100");
    assert.equal(response.headers.get("content-range"), "bytes 0-99/100");
    assert.equal(response.headers.get("cloudflare-cdn-cache-control"), "no-store");
    assert.equal((await response.arrayBuffer()).byteLength, 100);
  });

  it("entrega somente o Range solicitado e recusa token adulterado", async () => {
    const token = videoStreamImportSourceToken("psychologist/video/video.mp4");
    assert.ok(token);
    const response = await fetch(`${baseUrl}/public/video-stream-import/v1/${token}`, {
      headers: { Range: "bytes=0-0" },
    });

    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-length"), "1");
    assert.equal(response.headers.get("content-range"), "bytes 0-0/100");
    assert.equal(await response.text(), "x");

    const rejected = await fetch(`${baseUrl}/public/video-stream-import/v1/${token}?extra=1`);
    assert.equal(rejected.status, 404);
  });

  it("não transforma mídia não-vídeo do prefixo compartilhado em origem Stream", async () => {
    const token = videoStreamImportSourceToken("posts/media/image.jpg");
    assert.ok(token);
    const response = await fetch(`${baseUrl}/public/video-stream-import/v1/${token}`, {
      method: "HEAD",
    });

    assert.equal(response.status, 404);
  });
});
