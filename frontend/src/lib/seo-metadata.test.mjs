import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const { publicCommunityOpenGraphImageHref, publicPsychologistOpenGraphImageHref } = await import(
  "../utils/public-routes.ts"
);

test("rotas de imagem Open Graph de entidades usam API publica quadrada e versionada", () => {
  assert.equal(
    publicPsychologistOpenGraphImageHref("psy/1", "2026-08-27T23:00:00.000Z"),
    "/api/og/psicologos/psy%2F1?v=2026-08-27T23%3A00%3A00.000Z",
  );
  assert.equal(
    publicCommunityOpenGraphImageHref("ansiedade-e-autocuidado", "v1"),
    "/api/og/comunidades/ansiedade-e-autocuidado?v=v1",
  );
});

test("metadata dinamico de perfil e comunidade aponta para imagem quadrada gerada", () => {
  const source = readFileSync(new URL("./seo-metadata.ts", import.meta.url), "utf8");

  assert.match(source, /publicPsychologistOpenGraphImageHref\(id, seo\.updated_at\)/);
  assert.match(source, /publicCommunityOpenGraphImageHref\(seo\.slug, seo\.updated_at\)/);
  assert.match(source, /imageHeight: squareImage \? 1200 : seo\.og_image_height/);
  assert.match(source, /imageWidth: squareImage \? 1200 : seo\.og_image_width/);
});

test("renderizador de imagem social gera canvas quadrado sem elemento HTML bruto", () => {
  const source = readFileSync(new URL("./square-og-image.tsx", import.meta.url), "utf8");

  assert.match(source, /SQUARE_OPEN_GRAPH_IMAGE_SIZE = 1200/);
  assert.match(source, /height: SQUARE_OPEN_GRAPH_IMAGE_SIZE/);
  assert.match(source, /width: SQUARE_OPEN_GRAPH_IMAGE_SIZE/);
  assert.match(source, /const fit = sourceUrl \? "cover" : "contain"/);
  assert.doesNotMatch(source, new RegExp(`<${"img"}(?:\\s|>)`, "u"));
});
