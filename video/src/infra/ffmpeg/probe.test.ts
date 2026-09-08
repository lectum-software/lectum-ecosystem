import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRemoteVideoProbeArguments } from "./probe.js";

describe("FFprobe remote video command", () => {
  it("envia headers seguros para probe de HLS privado", () => {
    const sourceUrl =
      "https://customer-code_123.cloudflarestream.com/eyJhbGci.eyJzdWIi.signature/manifest/video.m3u8";
    const args = buildRemoteVideoProbeArguments({
      requestOrigin: "https://homolog.lectum.com.br",
      sourceUrl,
    });
    const headersIndex = args.indexOf("-headers");

    assert.notEqual(headersIndex, -1);
    assert.equal(args[headersIndex + 1]?.includes("Origin: https://homolog.lectum.com.br"), true);
    assert.equal(args[headersIndex + 1]?.includes("Referer: https://homolog.lectum.com.br/"), true);
    assert.ok(headersIndex < args.indexOf(sourceUrl));
    assert.equal(args.at(-1), sourceUrl);
  });
});
