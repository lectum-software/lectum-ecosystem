import assert from "node:assert/strict";
import { test } from "node:test";
import { activitiesProfileWhere } from "./activity-profile-where";

// Contrato do filtro enviado ao Prisma; estes testes não executam consultas ao banco.
test("histórico Admin não condiciona o alvo a active=true nem active=false", () => {
  const where = activitiesProfileWhere("profile-id");
  assert.equal(Object.hasOwn(where.user, "active"), false);
});

test("filtro preserva exclusão lógica tanto do perfil quanto da conta", () => {
  const where = activitiesProfileWhere("profile-id");
  assert.equal(where.deleted, false);
  assert.equal(where.user.deleted, false);
});

test("filtro mantém o papel psicólogo obrigatório no usuário vinculado", () => {
  assert.equal(activitiesProfileWhere("profile-id").user.role, "psicologo");
});

test("busca aceita somente os dois identificadores exatos já suportados", () => {
  for (const id of ["profile-id", "user-id", "id-com-prefixo-parecido"]) {
    assert.deepEqual(activitiesProfileWhere(id).OR, [{ id }, { user_id: id }]);
  }
});

test("forma integral da query mantém ID, vínculo, papel e exclusão", () => {
  assert.deepEqual(activitiesProfileWhere("profile-id"), {
    deleted: false,
    OR: [{ id: "profile-id" }, { user_id: "profile-id" }],
    user: { deleted: false, role: "psicologo" },
  });
});

test("cada chamada produz filtro independente sem acumular IDs", () => {
  const first = activitiesProfileWhere("first-id");
  const second = activitiesProfileWhere("second-id");
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.OR, second.OR);
  assert.notStrictEqual(first.user, second.user);
  assert.deepEqual(first.OR, [{ id: "first-id" }, { user_id: "first-id" }]);
  assert.deepEqual(second.OR, [{ id: "second-id" }, { user_id: "second-id" }]);
});
