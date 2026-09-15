import assert from "node:assert/strict";
import test from "node:test";

const { getDynamicEntityOpenGraphImageNotice } = await import("./seo-dynamic-og-image.ts");

test("explica imagem personalizada para perfil de psicologo", () => {
  const notice = getDynamicEntityOpenGraphImageNotice({ page_key: "psychologist_profile" });

  assert.equal(notice?.title, "Imagem personalizada por perfil");
  assert.match(notice?.description ?? "", /foto pública do psicólogo/);
  assert.match(notice?.fallbackDescription ?? "", /fallback do template/);
});

test("explica imagem personalizada para comunidade", () => {
  const notice = getDynamicEntityOpenGraphImageNotice({ page_key: "community_detail" });

  assert.equal(notice?.title, "Imagem personalizada por comunidade");
  assert.match(notice?.description ?? "", /avatar/);
  assert.match(notice?.previewDescription ?? "", /prévia mostra o fallback/);
});

test("mantem demais templates sem aviso de imagem dinamica de entidade", () => {
  for (const page_key of ["default", "home", "psychologists", "community", "community_post"]) {
    assert.equal(getDynamicEntityOpenGraphImageNotice({ page_key }), null);
  }
});
