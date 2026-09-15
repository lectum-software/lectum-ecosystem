import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toPostAuthorResponse } from "./profile-response";

const author = {
  id: "unit-author",
  deleted: false,
  name: "Nome de teste",
  avatar: "/public/files/avatar/test.png",
  role: "paciente",
  psychologist_profile: null,
};

describe("directory publication author privacy", () => {
  it("não devolve nome ou avatar de paciente excluído em post não anônimo", () => {
    const response = toPostAuthorResponse({ ...author, deleted: true });
    assert.equal(response.name, "Membro Excluído");
    assert.equal(response.avatar, null);
    assert.equal(response.whatsapp_url, null);
  });

  it("não devolve identidade profissional excluída em previews", () => {
    const response = toPostAuthorResponse(
      {
        ...author,
        deleted: true,
        role: "psicologo",
        psychologist_profile: {
          professional_first_name: "Profissional",
          professional_last_name: "Teste",
          gender: "feminino",
          crp: "06/123456",
          whatsapp: null,
          cfp_verified_at: new Date(0),
          crp_status: "verificado",
          subscriptions: [{ id: "unit-entitlement", source: "admin_grant" }],
        },
      },
      100,
    );
    assert.equal(response.name, "Psicólogo Excluído");
    assert.equal(response.avatar, null);
    assert.equal(response.crp, null);
    assert.equal(response.verified, false);
    assert.equal(response.featured_badge, null);
    assert.equal(response.whatsapp_name, null);
    assert.equal(response.whatsapp_url, null);
  });

  it("preserva autor público ativo e anonimato explícito", () => {
    assert.equal(toPostAuthorResponse(author).name, author.name);
    assert.equal(toPostAuthorResponse(author).avatar, author.avatar);
    const anonymous = toPostAuthorResponse(author, 0, true, "Membro Anônimo #1234");
    assert.equal(anonymous.name, "Membro Anônimo #1234");
    assert.equal(anonymous.avatar, null);
  });
});
