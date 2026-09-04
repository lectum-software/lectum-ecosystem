import assert from "node:assert/strict";
import { createServer, type RequestListener } from "node:http";
import { afterEach, describe, it } from "node:test";
import { VideoProcessingServiceClient, VideoProcessingServiceError } from "./client";
import {
  parseVideoProcessingServiceUrl,
  resolveVideoProcessingServiceConfig,
  type VideoProcessingServiceConfig,
} from "./config";

const openServers = new Set<ReturnType<typeof createServer>>();

afterEach(async () => {
  await Promise.all(
    [...openServers].map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
          server.closeAllConnections();
        }),
    ),
  );
  openServers.clear();
});

const startServer = async (listener: RequestListener) => {
  const server = createServer(listener);
  openServers.add(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
};

const createConfig = (baseUrl: string, apiKey = "k".repeat(64)): VideoProcessingServiceConfig => ({
  apiKey,
  baseUrl,
  requestTimeoutMs: 2_000,
});

describe("video processing service configuration", () => {
  it("permanece opcional e diferencia configuração parcial inválida", () => {
    assert.deepEqual(resolveVideoProcessingServiceConfig({ NODE_ENV: "production" }), {
      config: null,
      status: "disabled",
    });
    assert.deepEqual(
      resolveVideoProcessingServiceConfig({
        NODE_ENV: "production",
        VIDEO_PROCESSING_SERVICE_URL: "http://192.168.250.2:3003",
      }),
      { config: null, status: "invalid" },
    );
  });

  it("aceita somente endpoint privado em runtime publicado", () => {
    assert.equal(
      parseVideoProcessingServiceUrl("http://192.168.250.2:3003", {
        publishedRuntime: true,
      }),
      "http://192.168.250.2:3003",
    );
    assert.equal(
      parseVideoProcessingServiceUrl("http://45.140.193.89:3003", {
        publishedRuntime: true,
      }),
      null,
    );
    assert.equal(
      parseVideoProcessingServiceUrl("http://video.internal:3003", {
        publishedRuntime: true,
      }),
      null,
    );
    assert.equal(
      parseVideoProcessingServiceUrl("http://127.0.0.1:3003", { publishedRuntime: true }),
      null,
    );
    assert.equal(
      parseVideoProcessingServiceUrl("http://192.168.250.2:3003/unsafe", {
        publishedRuntime: true,
      }),
      null,
    );
  });

  it("aceita localhost apenas para desenvolvimento", () => {
    assert.equal(
      parseVideoProcessingServiceUrl("http://localhost:3003", { publishedRuntime: false }),
      "http://localhost:3003",
    );
  });
});

describe("video processing service client", () => {
  it("valida readiness, versão e Bearer por HTTP real sem criar job", async () => {
    const expectedKey = "s".repeat(64);
    const visitedPaths: string[] = [];
    const baseUrl = await startServer((request, response) => {
      visitedPaths.push(request.url ?? "");
      response.setHeader("Content-Type", "application/json; charset=utf-8");

      if (request.url === "/ready") {
        response
          .writeHead(200)
          .end(JSON.stringify({ data: { status: "ready" }, status: 200, success: true }));
        return;
      }
      if (request.url === "/version") {
        response
          .writeHead(200)
          .end(JSON.stringify({ data: { version: "1.2.3" }, status: 200, success: true }));
        return;
      }
      if (request.headers.authorization !== `Bearer ${expectedKey}`) {
        response
          .writeHead(401)
          .end(JSON.stringify({ code: "unauthorized", status: 401, success: false }));
        return;
      }
      response
        .writeHead(404)
        .end(JSON.stringify({ code: "job_not_found", status: 404, success: false }));
    });

    const result = await new VideoProcessingServiceClient(
      createConfig(baseUrl, expectedKey),
    ).checkConnection();

    assert.deepEqual(result, {
      authentication: "valid",
      readiness: "ready",
      version: "1.2.3",
    });
    assert.deepEqual(visitedPaths, ["/ready", "/version", "/api/private/jobs/connection-check"]);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(expectedKey));
  });

  it("classifica chave divergente sem expor credencial ou resposta", async () => {
    const baseUrl = await startServer((_request, response) => {
      response
        .writeHead(401, { "Content-Type": "application/json" })
        .end(JSON.stringify({ code: "unauthorized", status: 401, success: false }));
    });
    const client = new VideoProcessingServiceClient(createConfig(baseUrl));

    await assert.rejects(client.verifyAuthentication(), (error: unknown) => {
      assert.ok(error instanceof VideoProcessingServiceError);
      assert.equal(error.failure, "authentication");
      assert.equal(error.operation, "authentication");
      assert.equal(error.status, 401);
      assert.doesNotMatch(error.message, /unauthorized|kkkk/u);
      return true;
    });
  });

  it("recusa redirect e resposta acima do limite", async () => {
    const redirectBaseUrl = await startServer((_request, response) => {
      response.writeHead(302, { Location: "http://127.0.0.1:9/redirected" }).end();
    });
    const redirectClient = new VideoProcessingServiceClient(createConfig(redirectBaseUrl));

    await assert.rejects(redirectClient.checkReadiness(), (error: unknown) => {
      assert.ok(error instanceof VideoProcessingServiceError);
      assert.equal(error.failure, "unreachable");
      return true;
    });

    const oversizedBaseUrl = await startServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          data: { padding: "x".repeat(20 * 1_024), status: "ready" },
          status: 200,
          success: true,
        }),
      );
    });
    const oversizedClient = new VideoProcessingServiceClient(createConfig(oversizedBaseUrl));

    await assert.rejects(oversizedClient.checkReadiness(), (error: unknown) => {
      assert.ok(error instanceof VideoProcessingServiceError);
      assert.equal(error.failure, "contract");
      return true;
    });
  });
});
