import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { probeR2MigrationPublicSource, R2MigrationSourceError } from "./source";

const SOURCE_URL = "https://homolog-api.lectum.com.br/public/video-stream-import/v1/c291cmNl";

describe("probe da origem pública para Stream", () => {
  it("confirma HEAD e GET Range com tamanho coerente", async () => {
    const requests: Array<{ method: string; range: string | null }> = [];
    const fetcher = (async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      requests.push({ method: init?.method ?? "GET", range: headers.get("range") });

      if (init?.method === "HEAD") {
        return new Response(null, {
          headers: {
            "Accept-Ranges": "bytes",
            "CF-Cache-Status": "DYNAMIC",
            "Content-Length": "100",
            "Content-Range": "bytes 0-99/100",
          },
          status: 200,
        });
      }

      return new Response("x", {
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Length": "1",
          "Content-Range": "bytes 0-0/100",
        },
        status: 206,
      });
    }) as typeof fetch;

    await probeR2MigrationPublicSource(SOURCE_URL, 100, fetcher);
    assert.deepEqual(requests, [
      { method: "HEAD", range: null },
      { method: "GET", range: "bytes=0-0" },
    ]);
  });

  it("expõe somente diagnóstico controlado quando o CDN remove Content-Range", async () => {
    const fetcher = (async () =>
      new Response(null, {
        headers: {
          "Accept-Ranges": "bytes",
          "CF-Cache-Status": "HIT",
          "Content-Length": "100",
        },
        status: 200,
      })) as typeof fetch;

    await assert.rejects(
      probeR2MigrationPublicSource(SOURCE_URL, 100, fetcher),
      (error: unknown) => {
        assert.ok(error instanceof R2MigrationSourceError);
        assert.equal(error.reason, "public_source_head_invalid");
        assert.deepEqual(error.diagnostic, {
          acceptRangesMatches: true,
          cacheStatus: "hit",
          contentLengthMatches: true,
          contentRangeMatches: false,
          httpStatus: 200,
          probe: "head",
        });
        assert.doesNotMatch(JSON.stringify(error.diagnostic), /homolog|public|source/);
        return true;
      },
    );
  });
});
