import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { it } from "node:test";
import { parseVideoServiceConfig } from "../../config/env.js";
import { VideoProcessingError } from "../../domain/jobs/contracts.js";
import { fetchRemoteVideo } from "./remote-fetch.js";
import { downloadRemoteVideoSourceFile } from "./remote-source.js";

const config = parseVideoServiceConfig({
  NODE_ENV: "test",
  REDIS_URL: "redis://localhost:6379/0",
  VIDEO_SERVICE_API_KEY: "x".repeat(32),
});

// Real local adversarial HTTP streams exercise the downloader through its
// existing transport seam. This is not validation of an external video source.
const withLocalSource = async (
  handler: (response: ServerResponse) => void,
  run: (sourceUrl: string, directory: string) => Promise<void>,
) => {
  const directory = await mkdtemp(path.join(tmpdir(), "lectum-video-http-"));
  const server = createServer((_request, response) => handler(response));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}/source.mp4`, directory);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { force: true, recursive: true });
  }
};

for (const sendHeaders of [false, true]) {
  it(`limita download real parado ${sendHeaders ? "durante body" : "antes dos headers"}`, async () => {
    await withLocalSource(
      (response) => {
        if (sendHeaders) {
          response.writeHead(200, { "Content-Type": "video/mp4" });
          response.write(Buffer.alloc(16));
        }
      },
      async (sourceUrl, directory) => {
        await assert.rejects(
          downloadRemoteVideoSourceFile({
            config: { ...config, jobTimeoutMs: 100 },
            fetcher: fetch,
            outputPath: path.join(directory, "source"),
            signal: AbortSignal.timeout(3000),
            sourceUrl,
          }),
          (error) =>
            error instanceof VideoProcessingError &&
            error.code === "processing_failed" &&
            error.retryable,
        );
        assert.deepEqual(await readdir(directory), []);
      },
    );
  });
}

it("fecha o stream real quando a criação do arquivo falha", async () => {
  let sourceClosed: Promise<unknown> | undefined;
  await withLocalSource(
    (response) => {
      sourceClosed = once(response, "close");
      response.writeHead(200, { "Content-Type": "video/mp4" });
      response.write(Buffer.alloc(16));
    },
    async (sourceUrl, directory) => {
      const blockedDirectory = path.join(directory, "blocked");
      await writeFile(blockedDirectory, "isolated fixture");
      await assert.rejects(
        downloadRemoteVideoSourceFile({
          config,
          fetcher: fetch,
          outputPath: path.join(blockedDirectory, "source"),
          sourceUrl,
        }),
        (error) => error instanceof VideoProcessingError && error.retryable,
      );
      assert.ok(sourceClosed);
      await Promise.race([
        sourceClosed,
        new Promise<never>((_resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("stream_not_closed")), 1000);
          timer.unref();
        }),
      ]);
    },
  );
});

it("o transporte de produção recusa loopback sem abrir conexão", async () => {
  let requests = 0;
  await withLocalSource(
    (response) => {
      requests += 1;
      response.end();
    },
    async (sourceUrl) => {
      await assert.rejects(fetchRemoteVideo(sourceUrl.replace("http:", "https:")));
      assert.equal(requests, 0);
    },
  );
});
