import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublicApiSource,
  getPublicAssetSources,
  isAllowedPublicAssetSource,
  isIpLiteralHostname,
  isLocalAssetHostname,
  isTrustedPublicAssetUrl,
  parsePublicAssetSource,
} from "./public-asset-sources.ts";
import { normalizeSafeInternalRedirect } from "./safe-redirect.ts";

test("aceita somente origens HTTPS externas em ambiente publicado", () => {
  const external = parsePublicAssetSource("https://media.example.com:8443");
  assert.deepEqual(external, {
    host: "media.example.com:8443",
    hostname: "media.example.com",
    origin: "https://media.example.com:8443",
    port: "8443",
    protocol: "https",
  });
  assert.equal(external && isAllowedPublicAssetSource(external, "production"), true);

  for (const value of [
    "http://media.example.com",
    "https://127.0.0.1",
    "https://127.1",
    "https://2130706433",
    "https://203.0.113.10",
    "https://[2001:db8::1]",
    "https://[::ffff:127.0.0.1]",
    "https://localhost",
    "https://assets.localhost",
  ]) {
    const source = parsePublicAssetSource(value);
    assert.ok(source, value);
    assert.equal(isAllowedPublicAssetSource(source, "production"), false, value);
  }
});

test("restringe origens locais ao desenvolvimento", () => {
  for (const value of [
    "http://localhost:3001",
    "https://127.0.0.1:3001",
    "http://[::1]:3001",
    "https://[::ffff:127.0.0.1]:3001",
  ]) {
    const source = parsePublicAssetSource(value);
    assert.ok(source, value);
    assert.equal(isAllowedPublicAssetSource(source, "development"), true, value);
  }

  const insecureExternal = parsePublicAssetSource("http://media.example.com");
  assert.ok(insecureExternal);
  assert.equal(isAllowedPublicAssetSource(insecureExternal, "development"), false);
});

test("recusa configurações ambíguas, credenciais, caminhos e curingas", () => {
  for (const value of [
    "//media.example.com",
    "https:\\media.example.com",
    "https:/media.example.com",
    "https:media.example.com",
    "https:////media.example.com",
    "ftp://media.example.com",
    "https://user:password@media.example.com",
    "https://media.example.com/path",
    "https://media.example.com?debug=true",
    "https://media.example.com#fragment",
    "https://media.example.com\u0000.evil.example",
    "https://*.example.com",
  ]) {
    assert.equal(parsePublicAssetSource(value), null, value);
  }
});

test("classifica IPs e hosts locais sem consulta de rede", () => {
  assert.equal(isIpLiteralHostname("203.0.113.10"), true);
  assert.equal(isIpLiteralHostname("[2001:db8::1]"), true);
  assert.equal(isIpLiteralHostname("media.example.com"), false);
  assert.equal(isLocalAssetHostname("LOCALHOST."), true);
  assert.equal(isLocalAssetHostname("[::1]"), true);
  assert.equal(isLocalAssetHostname("media.example.com"), false);
});

test("resolve API e hosts extras sem liberar fonte inválida", () => {
  assert.equal(getPublicApiSource({ nodeEnv: "production" }), null);
  assert.equal(
    getPublicApiSource({ apiUrl: "http://api.example.com", nodeEnv: "production" }),
    null,
  );
  assert.equal(
    getPublicApiSource({ apiUrl: "https://api.example.com", nodeEnv: "production" })?.origin,
    "https://api.example.com",
  );

  const sources = getPublicAssetSources({
    apiUrl: "https://api.example.com",
    imageRemoteHosts:
      "media.example.com,https://media.example.com,http://unsafe.example.com,https://127.0.0.1",
    nodeEnv: "production",
  });
  assert.deepEqual(sources.map((source) => source.origin).sort(), [
    "https://api.example.com",
    "https://lh3.googleusercontent.com",
    "https://media.example.com",
  ]);
});

test("confia apenas em URL com protocolo, host e porta autorizados", () => {
  const options = {
    apiUrl: "https://api.example.com:8443",
    imageRemoteHosts: "https://media.example.com",
    nodeEnv: "production",
  };

  assert.equal(
    isTrustedPublicAssetUrl(new URL("https://api.example.com:8443/file"), options),
    true,
  );
  assert.equal(isTrustedPublicAssetUrl(new URL("https://media.example.com/file"), options), true);
  assert.equal(isTrustedPublicAssetUrl(new URL("https://api.example.com/file"), options), false);
  assert.equal(isTrustedPublicAssetUrl(new URL("http://media.example.com/file"), options), false);
  assert.equal(
    isTrustedPublicAssetUrl(new URL("https://user@media.example.com/file"), options),
    false,
  );
});

test("mantém redirecionamentos internos dentro da aplicação", () => {
  assert.equal(
    normalizeSafeInternalRedirect(" /app/perfil?aba=conta#dados "),
    "/app/perfil?aba=conta#dados",
  );

  for (const value of [
    "https://evil.example/app",
    "//evil.example/app",
    "/\\evil.example/app",
    "/%2f%2fevil.example/app",
    "/%5cevil.example/app",
    "/app\u0000/conta",
  ]) {
    assert.equal(normalizeSafeInternalRedirect(value), null, value);
  }

  assert.equal(normalizeSafeInternalRedirect("https://evil.example", "/inicio"), "/inicio");
});
