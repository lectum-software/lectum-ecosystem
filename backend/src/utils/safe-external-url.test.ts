import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSafeExternalHttpsUrl } from "./safe-external-url";

describe("parseSafeExternalHttpsUrl", () => {
  it("aceita URL HTTPS pública sem credenciais", () => {
    const url = parseSafeExternalHttpsUrl("https://push.example.com/subscription?key=value");
    assert.equal(url?.hostname, "push.example.com");
    assert.equal(url?.pathname, "/subscription");
    assert.equal(url?.search, "?key=value");
  });

  it("recusa destinos locais, IPs, portas alternativas e credenciais", () => {
    const unsafeUrls = [
      "http://push.example.com/subscription",
      "//push.example.com/subscription",
      "https:///push.example.com/subscription",
      "https:////push.example.com/subscription",
      "https:\\push.example.com/subscription",
      "https://*.example.com/subscription",
      "https://localhost/subscription",
      "https://127.0.0.1/subscription",
      "https://push.example.com:8443/subscription",
      "https://user:password@push.example.com/subscription",
      "https://push.example.com/subscription#fragment",
      "https://push.example.com/subscription\n",
      "https://metadata.google.internal/computeMetadata/v1",
      "https://metadata.google.internal./computeMetadata/v1",
      "https://service.corp/resource",
    ];

    for (const url of unsafeUrls) {
      assert.equal(parseSafeExternalHttpsUrl(url), null);
    }
  });
});
