import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCloudflareDirectUploadUrlFailure, VideoStreamProviderError } from "./cloudflare-stream";

describe("contrato de destino do upload Stream", () => {
  it("aceita somente os dois hosts de ingestão, preservando capabilities opacas", () => {
    for (const host of ["upload.videodelivery.net", "upload.cloudflarestream.com"]) {
      for (const path of [
        "/direct-capability",
        "/tus/capability?tusv2=true&token=opaque%2Bvalue",
      ]) {
        assert.equal(getCloudflareDirectUploadUrlFailure(`https://${host}${path}`), null);
        assert.equal(getCloudflareDirectUploadUrlFailure(`https://${host}:443${path}`), null);
      }
    }
  });

  it("não amplia a confiança para hosts parecidos, playback, IPs ou subdomínios arbitrários", () => {
    for (const host of [
      "upload.cloudflarestream.com.attacker.example",
      "attacker-upload.cloudflarestream.com",
      "customer-example.cloudflarestream.com",
      "sub.upload.cloudflarestream.com",
      "cloudflarestream.com",
      "upload.videodelivery.net.attacker.example",
      "sub.upload.videodelivery.net",
      "localhost",
      "127.0.0.1",
      "[::1]",
    ]) {
      assert.equal(
        getCloudflareDirectUploadUrlFailure(`https://${host}/upload`),
        "upload_url_host",
      );
    }
  });

  it("recusa protocolo, credenciais, portas alternativas e fragmentos", () => {
    const origin = "upload.cloudflarestream.com";
    assert.equal(getCloudflareDirectUploadUrlFailure(`http://${origin}/x`), "upload_url_protocol");
    assert.equal(getCloudflareDirectUploadUrlFailure(`ftp://${origin}/x`), "upload_url_protocol");
    assert.equal(
      getCloudflareDirectUploadUrlFailure(`https://user:secret@${origin}/x`),
      "upload_url_credentials",
    );
    assert.equal(
      getCloudflareDirectUploadUrlFailure(`https://${origin}:8443/x`),
      "upload_url_port",
    );
    assert.equal(
      getCloudflareDirectUploadUrlFailure(`https://${origin}/x#fragment`),
      "upload_url_fragment",
    );
  });

  it("recusa URL ausente, excessiva ou ambígua antes da normalização do parser", () => {
    assert.equal(getCloudflareDirectUploadUrlFailure(""), "upload_url_missing");
    for (const value of [
      "not-a-url",
      `https://upload.cloudflarestream.com/${"x".repeat(16_384)}`,
      "https://upload.cloudflarestream.com\\@attacker.example/x",
      "https://upload.cloudflare\nstream.com/x",
      "https://upload.cloudflarestream.com/x y",
    ]) {
      assert.equal(getCloudflareDirectUploadUrlFailure(value), "upload_url_invalid");
    }
  });
});

describe("fallback de provisionamento sem duplicar reservas", () => {
  it("não tenta TUS após sucesso HTTP com contrato rejeitado, timeout ou 5xx", () => {
    for (const status of [null, 200, 201, 202, 401, 403, 429, 500, 502, 503, 504]) {
      assert.equal(
        new VideoStreamProviderError("provision_direct_upload", status).canFallbackToTus,
        false,
      );
      assert.equal(
        new VideoStreamProviderError("provision_direct_upload_contract", status, "invalid_uid")
          .canFallbackToTus,
        false,
      );
    }
  });

  it("permite fallback somente quando o POST básico é rejeitado explicitamente", () => {
    for (const status of [400, 404, 405, 415, 422]) {
      assert.equal(
        new VideoStreamProviderError("provision_direct_upload", status).canFallbackToTus,
        true,
      );
      assert.equal(
        new VideoStreamProviderError("provision_upload", status).canFallbackToTus,
        false,
      );
    }
  });

  it("expõe somente classificação controlada no erro, nunca URL ou payload", () => {
    const error = new VideoStreamProviderError("provision_upload_contract", 201, "upload_url_host");
    assert.deepEqual(JSON.parse(JSON.stringify(error)), {
      name: "VideoStreamProviderError",
      operation: "provision_upload_contract",
      status: 201,
      reason: "upload_url_host",
    });
    assert.equal(error.message, "VIDEO_STREAM_PROVIDER_UNAVAILABLE");
  });
});
