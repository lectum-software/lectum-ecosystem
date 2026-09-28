import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const { publicCommunityOpenGraphImageHref, publicPsychologistOpenGraphImageHref } = await import(
  "../utils/public-routes.ts"
);

test("avaliacao preserva imagem e descricao do perfil com titulo e destino proprios", async (t) => {
  const previousApi = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_URL = "https://api.lectum.com.br";
  t.after(() => {
    if (previousApi === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previousApi;
  });
  const { resolvePsychologistReviewSeoMetadata, resolvePsychologistSeoMetadata } = await import(
    "./seo-metadata.ts"
  );
  const seo = {
    name: "Nome do Profissional",
    title: "Nome do Profissional | Lectum",
    og_title: "Nome do Profissional",
    description: "Descricao publica do perfil.",
    og_description: "Descricao publica compartilhada.",
    canonical_url: "https://www.lectum.com.br/psicologos/psy-1",
    og_image_url: "https://www.lectum.com.br/photo.jpg",
    updated_at: "2026-09-28T12:00:00Z",
  };
  t.mock.method(globalThis, "fetch", async (url) =>
    Response.json({
      success: true,
      data: String(url).includes("/psychologist/") ? seo : { settings: [] },
    }),
  );
  const profile = await resolvePsychologistSeoMetadata({
    id: "psy-1",
    fallback: { title: "Perfil", description: "Perfil" },
  });
  const review = await resolvePsychologistReviewSeoMetadata("psy-1");
  assert.deepEqual(review.title, { absolute: "Avalie Nome do Profissional" });
  assert.equal(review.openGraph.title, "Avalie Nome do Profissional");
  assert.equal(review.twitter.title, review.openGraph.title);
  assert.equal(review.openGraph.images[0].url, profile.openGraph.images[0].url);
  assert.equal(review.openGraph.images[0].width, 1200);
  assert.deepEqual(review.twitter.images, profile.twitter.images);
  assert.equal(review.description, profile.description);
  assert.equal(review.openGraph.description, profile.openGraph.description);
  assert.equal(new URL(review.openGraph.url).pathname, "/app/avaliacoes/nova");
  assert.equal(new URL(review.openGraph.url).searchParams.get("psychologist_id"), "psy-1");
  assert.equal(review.alternates.canonical, review.openGraph.url);
  assert.equal(review.robots.index, false);
});

test("avaliacao sem perfil valido usa fallback seguro e mantem destino codificado", async (t) => {
  const { resolvePsychologistReviewSeoMetadata } = await import("./seo-metadata.ts");
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("offline");
  });
  for (const id of [undefined, "missing&other=value"]) {
    const metadata = await resolvePsychologistReviewSeoMetadata(id);
    assert.equal(metadata.openGraph.title, "Avalie seu psicólogo | Lectum");
    const url = new URL(metadata.openGraph.url);
    assert.equal(url.searchParams.get("psychologist_id"), id ?? null);
    assert.equal(url.searchParams.has("other"), false);
    assert.equal(metadata.robots.index, false);
  }
});

test("ranking share links preserve and encode the community", async () => {
  const { publicTopMentorsHref } = await import("../utils/public-routes.ts");
  assert.equal(publicTopMentorsHref(), "/comunidades/top-mentores");
  const url = new URL(publicTopMentorsHref("luto & recomeço"), "https://lectum.com.br");
  assert.equal(url.searchParams.get("community"), "luto & recomeço");
  assert.equal([...url.searchParams].length, 1);
});

test("ranking metadata reuses the community avatar and keeps the ranking canonical", () => {
  const source = readFileSync(new URL("./seo-metadata.ts", import.meta.url), "utf8");
  const ranking = source.slice(source.indexOf("export const resolveTopMentorsSeoMetadata"));
  assert.match(ranking, /getPublicCommunitySeo\(\{ slug: community \}\)/);
  assert.match(ranking, /publicTopMentorsHref\(seo\?\.slug \?\? community\)/);
  assert.match(ranking, /const image = seo\?\.og_image_url \?\? undefined/);
  assert.match(ranking, /openGraphUrl: canonical/);
});

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
