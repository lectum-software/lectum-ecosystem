import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { managedSeoRouteDefaults } from "./managed-route-defaults";
import { SEO_METADATA_DEFAULTS } from "./metadata-settings";

describe("rotas gerenciadas dos metadados", () => {
  it("projeta os aliases exatos sem alterar a entrada", () => {
    for (const [page_key, legacy, current] of [
      ["community", "/community", "/comunidades"],
      ["psychologists", "/psychologists", "/psicologos"],
      ["top_mentors", "/community/top-mentors", "/comunidades/top-mentores"],
    ]) {
      const input = Object.freeze({ page_key, canonical_url: legacy, route_path: legacy });
      assert.deepEqual(managedSeoRouteDefaults(input), {
        canonical_url: current,
        route_path: current,
      });
      assert.equal(input.canonical_url, legacy);
      assert.equal(input.route_path, legacy);
    }
  });

  it("preserva canônicos customizados, ausentes e variantes não gerenciadas", () => {
    for (const canonical_url of [
      null,
      "",
      "/minha-comunidade",
      "/community/",
      "/Community",
      "/community?origem=busca",
      "https://lectum.com.br/community",
    ]) {
      assert.deepEqual(
        managedSeoRouteDefaults({ page_key: "community", canonical_url, route_path: "/community" }),
        { canonical_url, route_path: "/comunidades" },
      );
    }
  });

  it("mantém defaults atuais e normaliza as rotas dinâmicas sem inventar canônico", () => {
    for (const setting of SEO_METADATA_DEFAULTS) {
      assert.deepEqual(
        managedSeoRouteDefaults({ ...setting, canonical_url: setting.canonical_url ?? null }),
        { canonical_url: setting.canonical_url ?? null, route_path: setting.route_path },
      );
    }
    assert.deepEqual(
      managedSeoRouteDefaults({
        page_key: "community_post_reply",
        canonical_url: null,
        route_path: "/community/[slug]/post/[id]/thread/[replyId]",
      }),
      { canonical_url: null, route_path: "/comunidades/[slug]/publicacao/[id]/resposta/[replyId]" },
    );
  });

  it("não normaliza chaves desconhecidas nem canônico de outra página", () => {
    assert.deepEqual(
      managedSeoRouteDefaults({
        page_key: "pagina-nao-gerenciada",
        canonical_url: "/community",
        route_path: "/caminho-existente",
      }),
      { canonical_url: "/community", route_path: "/caminho-existente" },
    );
    assert.deepEqual(
      managedSeoRouteDefaults({ page_key: "home", canonical_url: "/community", route_path: "/" }),
      { canonical_url: "/community", route_path: "/" },
    );
  });
});
