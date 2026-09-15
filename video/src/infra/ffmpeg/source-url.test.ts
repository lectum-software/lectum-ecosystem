import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isFirstPartyLectumPublicPostMediaUrl,
  parseRemoteVideoRequestOrigin,
  parseRemoteVideoSourceUrl,
} from "./source-url.js";

describe("remote source trust boundaries", () => {
  it("recusa playlists arbitrárias, mantendo somente HLS assinado do Stream", () => {
    assert.equal(parseRemoteVideoSourceUrl("https://example.com/video.m3u8"), null);
    assert.equal(
      parseRemoteVideoSourceUrl("https://api.lectum.com.br/public/files/posts/media/a.m3u8"),
      null,
    );
    assert.ok(
      parseRemoteVideoSourceUrl(
        "https://customer-a.cloudflarestream.com/eyJhbGci.eyJzdWIi.signature/manifest/video.m3u8",
      ),
    );
    assert.ok(parseRemoteVideoSourceUrl("https://example.com/video.mp4"));
  });

  it("não amplia a exceção de rede privada para portas ou caminhos codificados", () => {
    for (const value of [
      "https://api.lectum.com.br:8443/public/files/posts/media/a.mp4",
      "https://api.lectum.com.br/public/files/posts/media/%2f..%2f..%2fsecret.mp4",
      "https://api.lectum.com.br/public/files/posts/media/%252f..%252fsecret.mp4",
    ]) {
      assert.equal(isFirstPartyLectumPublicPostMediaUrl(new URL(value)), false, value);
      assert.equal(parseRemoteVideoSourceUrl(value), null, value);
    }
  });

  it("bloqueia IPv6 mapeado, multicast e endereços reservados", () => {
    for (const value of [
      "https://[::ffff:127.0.0.1]",
      "https://[::ffff:7f00:1]",
      "https://[ff02::1]",
      "https://[2001:db8::1]",
      "https://[64:ff9b::7f00:1]",
    ]) {
      assert.equal(parseRemoteVideoRequestOrigin(value), null, value);
    }
  });
});
