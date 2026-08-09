import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parsePublicHttpOrigin,
  parsePublicHttpOrigins,
  publicFileKeyFromUrl,
  publicFileUrl,
  resolvePublicWebUrl,
} from "./public-origin";

describe("public HTTP origin", () => {
  it("aceita origens HTTP(S) puras em desenvolvimento", () => {
    assert.equal(
      parsePublicHttpOrigin("http://localhost:3000", { productionRuntime: false }),
      "http://localhost:3000",
    );
    assert.equal(
      parsePublicHttpOrigin("https://app.example.com", { productionRuntime: false }),
      "https://app.example.com",
    );
  });

  it("recusa protocolo, credenciais, caminho, query, fragmento e controles", () => {
    for (const value of [
      "javascript:alert(1)",
      "https:///app.example.com",
      "https:////app.example.com",
      "https://user:password@app.example.com",
      "https://app.example.com/path",
      "https://app.example.com?query=1",
      "https://app.example.com#fragment",
      "//app.example.com",
      "https://*.example.com",
      "https:\\app.example.com",
      "https://app.example.com\nattacker.example",
    ]) {
      assert.equal(parsePublicHttpOrigin(value, { productionRuntime: false }), null);
    }
  });

  it("em produção aceita apenas HTTPS externo", () => {
    assert.equal(
      parsePublicHttpOrigin("https://app.example.com", { productionRuntime: true }),
      "https://app.example.com",
    );

    for (const value of [
      "http://app.example.com",
      "https://localhost",
      "https://app.localhost",
      "https://127.0.0.1",
      "https://[::1]",
      "https://0.0.0.0",
      "https://169.254.169.254",
      "https://192.168.1.1",
      "https://8.8.8.8",
      "https://[2001:4860:4860::8888]",
    ]) {
      assert.equal(parsePublicHttpOrigin(value, { productionRuntime: true }), null);
    }
  });

  it("filtra entradas inválidas e elimina origens repetidas", () => {
    assert.deepEqual(
      parsePublicHttpOrigins(
        "https://app.example.com, javascript:alert(1), https://app.example.com",
        { productionRuntime: true },
      ),
      ["https://app.example.com"],
    );
  });

  it("monta links internos no primeiro WEB_URL seguro e falha fechado sem origem", () => {
    const previous = process.env.WEB_URL;

    try {
      process.env.WEB_URL = "https://app.example.com";
      assert.equal(
        resolvePublicWebUrl("/auth/reset?from=email", { productionRuntime: true }),
        "https://app.example.com/auth/reset?from=email",
      );
      assert.equal(resolvePublicWebUrl("//attacker.example", { productionRuntime: true }), null);

      process.env.WEB_URL = "http://app.example.com";
      assert.equal(resolvePublicWebUrl("/auth/reset", { productionRuntime: true }), null);
    } finally {
      if (previous === undefined) delete process.env.WEB_URL;
      else process.env.WEB_URL = previous;
    }
  });
});

describe("publicFileUrl", () => {
  it("usa BASE somente quando ela é uma origem pública segura", () => {
    assert.equal(
      publicFileUrl("patient/avatar/file.webp", {
        baseUrl: "https://api.example.com",
        productionRuntime: true,
      }),
      "https://api.example.com/public/files/patient/avatar/file.webp",
    );
  });

  it("mantém fallback relativo quando BASE está ausente ou inválida", () => {
    for (const baseUrl of [null, "javascript:alert(1)", "http://api.example.com/path"]) {
      assert.equal(
        publicFileUrl("patient/avatar/file.webp", { baseUrl, productionRuntime: true }),
        "/public/files/patient/avatar/file.webp",
      );
    }
  });

  it("codifica delimitadores da chave e neutraliza traversal/segmentos inválidos", () => {
    assert.equal(
      publicFileUrl("posts/media/file?version#cover.webp", { baseUrl: null }),
      "/public/files/posts/media/file%3Fversion%23cover.webp",
    );

    for (const key of [
      "../secret",
      "posts/../secret",
      "posts//file.webp",
      "posts\\file.webp",
      "posts/file.webp\nsecret",
    ]) {
      assert.equal(publicFileUrl(key, { baseUrl: null }), "/public/files/unavailable");
    }
  });

  it("extrai somente chaves relativas ou da BASE exata com prefixo permitido", () => {
    const options = { baseUrl: "https://api.example.com", productionRuntime: true };
    const prefixes = ["patient/avatar/"];

    assert.equal(
      publicFileKeyFromUrl("/public/files/patient/avatar/file.webp", prefixes, options),
      "patient/avatar/file.webp",
    );
    assert.equal(
      publicFileKeyFromUrl(
        "https://api.example.com/public/files/patient/avatar/file.webp",
        prefixes,
        options,
      ),
      "patient/avatar/file.webp",
    );

    for (const value of [
      "https://attacker.example/public/files/patient/avatar/file.webp",
      "/public/files/patient/avatar/../secret",
      "/public/files/patient/avatar/%2e%2e/secret",
      "/public/files/patient/avatar/file.webp?version=1",
      "/public/files/patient/avatar/file.webp#cover",
      "/public/files/psychologist/avatar/file.webp",
      "/public/files/patient/avatar/%E0%A4%A",
    ]) {
      assert.equal(publicFileKeyFromUrl(value, prefixes, options), null);
    }
  });
});
