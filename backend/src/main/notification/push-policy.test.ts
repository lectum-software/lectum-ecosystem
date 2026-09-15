import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isImmediatePushSuppressedByDigestPolicy } from "./push-policy";

describe("isImmediatePushSuppressedByDigestPolicy", () => {
  it("suprime push imediato de engajamento do paciente para digest temporal", () => {
    assert.equal(isImmediatePushSuppressedByDigestPolicy("paciente", "upvote"), true);
    assert.equal(isImmediatePushSuppressedByDigestPolicy("paciente", "salvamento"), true);
    assert.equal(isImmediatePushSuppressedByDigestPolicy("paciente", "compartilhamento"), true);
  });

  it("mantem respostas imediatas para pacientes", () => {
    assert.equal(isImmediatePushSuppressedByDigestPolicy("paciente", "nova_resposta"), false);
  });

  it("suprime push imediato de digests do psicologo", () => {
    assert.equal(isImmediatePushSuppressedByDigestPolicy("psicologo", "visualizacao_perfil"), true);
    assert.equal(isImmediatePushSuppressedByDigestPolicy("psicologo", "compartilhamento"), true);
    assert.equal(isImmediatePushSuppressedByDigestPolicy("psicologo", "upvote"), true);
    assert.equal(isImmediatePushSuppressedByDigestPolicy("psicologo", "salvamento"), true);
    assert.equal(isImmediatePushSuppressedByDigestPolicy("psicologo", "novo_post"), true);
  });

  it("mantem favorito, avaliacao, whatsapp e resposta imediatos para psicologos", () => {
    assert.equal(isImmediatePushSuppressedByDigestPolicy("psicologo", "novo_favorito"), false);
    assert.equal(isImmediatePushSuppressedByDigestPolicy("psicologo", "nova_avaliacao"), false);
    assert.equal(isImmediatePushSuppressedByDigestPolicy("psicologo", "clique_whatsapp"), false);
    assert.equal(isImmediatePushSuppressedByDigestPolicy("psicologo", "nova_resposta"), false);
  });
});
