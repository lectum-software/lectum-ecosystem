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
    assert.equal(args[headersIndex + 1]?.includes("User-Agent: LectumVideoService/1.0"), true);
    assert.equal(args[headersIndex + 1]?.includes("Origin: https://homolog.lectum.com.br"), true);
    assert.equal(args[headersIndex + 1]?.includes("Referer: https://homolog.lectum.com.br/"), true);
    assert.equal(args.includes("-allowed_extensions"), true);
    assert.equal(args.at(args.indexOf("-tls_verify") + 1), "1");
    assert.equal(args.at(args.indexOf("-protocol_whitelist") + 1), "https,tcp,tls,crypto");
    assert.ok(headersIndex < args.indexOf(sourceUrl));
    assert.equal(args.at(-1), sourceUrl);
  });

  it("envia User-Agent controlado tambem para midia publica sem Origin", () => {
    const sourceUrl =
      "https://homolog-api.lectum.com.br/public/files/posts/media/l4gcubbiqb4i6wldhkq0keyk.mp4";
    const args = buildRemoteVideoProbeArguments(sourceUrl);
    const headersIndex = args.indexOf("-headers");

    assert.notEqual(headersIndex, -1);
    assert.equal(args[headersIndex + 1], "User-Agent: LectumVideoService/1.0\r\n");
    assert.ok(headersIndex < args.indexOf(sourceUrl));
    assert.equal(args.at(-1), sourceUrl);
    assert.equal(args.includes("-allowed_extensions"), false);
  });
});
