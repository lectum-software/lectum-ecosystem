import assert from "node:assert/strict";
import test from "node:test";
import { resolveAdminApiRequestUrl } from "./api-request-url.ts";
import {
  isAllowedConfiguredHttpOrigin,
  isIpAddressHostname,
  isLoopbackHostname,
  parseConfiguredHttpOrigin,
} from "./http-origin-policy.ts";

test("permite somente origens HTTPS externas por hostname em produção", () => {
  assert.equal(
    isAllowedConfiguredHttpOrigin(new URL("https://api.example.com"), "production"),
    true,
  );
  assert.equal(
    isAllowedConfiguredHttpOrigin(new URL("http://api.example.com"), "production"),
    false,
  );
  assert.equal(isAllowedConfiguredHttpOrigin(new URL("https://203.0.113.10"), "production"), false);
  assert.equal(
    isAllowedConfiguredHttpOrigin(new URL("https://[2001:db8::1]"), "production"),
    false,
  );
});

test("recusa curingas e todas as representações publicadas de loopback", () => {
  for (const value of [
    "https://*",
    "https://*.example.com",
    "https://**.example.com",
    "https://localhost",
    "https://admin.localhost",
    "https://127.0.0.2",
    "https://127.1",
    "https://2130706433",
    "https://[::1]",
    "https://[::ffff:127.0.0.1]",
  ]) {
    assert.equal(isAllowedConfiguredHttpOrigin(new URL(value), "production"), false, value);
  }
});

test("mantém loopback HTTP ou HTTPS restrito ao desenvolvimento", () => {
  for (const value of [
    "http://localhost:3001",
    "https://127.0.0.1:3001",
    "http://[::1]:3001",
    "https://[::ffff:127.0.0.1]:3001",
  ]) {
    assert.equal(isAllowedConfiguredHttpOrigin(new URL(value), "development"), true, value);
  }

  assert.equal(
    isAllowedConfiguredHttpOrigin(new URL("http://api.example.com"), "development"),
    false,
  );
});

test("classifica IPs e loopbacks normalizados sem consulta de rede", () => {
  assert.equal(isIpAddressHostname("203.0.113.10"), true);
  assert.equal(isIpAddressHostname("[2001:db8::1]"), true);
  assert.equal(isIpAddressHostname("api.example.com"), false);
  assert.equal(isLoopbackHostname("LOCALHOST."), true);
  assert.equal(isLoopbackHostname("[::ffff:7f00:1]"), true);
  assert.equal(isLoopbackHostname("example.com"), false);
});

test("analisa origens configuráveis sem aceitar normalizações ambíguas", () => {
  assert.equal(
    parseConfiguredHttpOrigin("https://api.example.com", { environment: "production" })?.origin,
    "https://api.example.com",
  );

  for (const value of [
    "//api.example.com",
    "https:\\api.example.com",
    "https:/api.example.com",
    "https:api.example.com",
    "https:////api.example.com",
    "ftp://api.example.com",
    "https://user:password@api.example.com",
    "https://api.example.com/path",
    "https://api.example.com?debug=true",
    "https://api.example.com#fragment",
    "https://api.example.com\u0000.evil.example",
    "https://*.example.com",
    "https://127.0.0.1",
  ]) {
    assert.equal(parseConfiguredHttpOrigin(value, { environment: "production" }), null, value);
  }
});

test("aceita hostname abreviado apenas quando o consumidor solicita", () => {
  assert.equal(
    parseConfiguredHttpOrigin("media.example.com:8443", {
      allowHostname: true,
      environment: "production",
    })?.origin,
    "https://media.example.com:8443",
  );
  assert.equal(parseConfiguredHttpOrigin("media.example.com", { environment: "production" }), null);
});

test("não envia credenciais ao origin do Admin quando a API está ausente", () => {
  assert.equal(resolveAdminApiRequestUrl(), "https://api.invalid");
  assert.equal(resolveAdminApiRequestUrl("   "), "https://api.invalid");
  assert.equal(resolveAdminApiRequestUrl(" https://api.example.com "), "https://api.example.com");
});
