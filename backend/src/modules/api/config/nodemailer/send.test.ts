import assert from "node:assert/strict";
import { describe, it } from "node:test";

import packageMetadata from "../../../../../package.json";
import { resolveEmailLogoUrl } from "./send";

describe("resolveEmailLogoUrl", () => {
  it("adiciona versionamento ao asset de logo absoluto", () => {
    assert.equal(
      resolveEmailLogoUrl("https://homolog-api.lectum.com.br/logo.png"),
      `https://homolog-api.lectum.com.br/logo.png?v=${packageMetadata.version}`,
    );
  });

  it("preserva parametros existentes e atualiza apenas o cache-buster", () => {
    assert.equal(
      resolveEmailLogoUrl("https://homolog-api.lectum.com.br/logo.png?theme=email&v=old"),
      `https://homolog-api.lectum.com.br/logo.png?theme=email&v=${packageMetadata.version}`,
    );
  });

  it("falha aberto para valores nao absolutos ou ausentes", () => {
    assert.equal(resolveEmailLogoUrl("/logo.png"), "/logo.png");
    assert.equal(resolveEmailLogoUrl(undefined), undefined);
  });
});
