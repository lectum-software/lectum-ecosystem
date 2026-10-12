import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { getReplyOwnerActionCopy } from "./reply-owner-action-copy.ts";

const replyCopy = (props = {}) =>
  getReplyOwnerActionCopy({ kind: "resposta", isPsychologist: false, hasReplies: false, ...props });

test("copy de resposta profissional concorda artigo, pronome e remoção", () => {
  const copy = replyCopy({ isPsychologist: true });
  assert.equal(copy.deleteTitle, "Excluir resposta?");
  assert.equal(
    copy.deleteDescription,
    "Esta resposta e as respostas encadeadas abaixo dela serão removidas.\n\nEsta ação não poderá ser desfeita.",
  );
});

test("copy de resposta de paciente com descendentes mantém aviso e pronome feminino", () => {
  assert.equal(
    replyCopy({ hasReplies: true }).deleteDescription,
    "Esta resposta já possui respostas de outros membros.\n\nAo excluir, as respostas encadeadas abaixo dela também serão removidas.\n\nEsta ação não poderá ser desfeita.",
  );
});

test("bloqueio e preservação usam resposta no feminino, com restrição específica a vídeo", () => {
  const copy = replyCopy();
  assert.equal(copy.blockedTitle, "Não é possível excluir esta resposta");
  assert.equal("preservedTitle" in copy, false);
  assert.match(copy.blockedDescription, /^Esta resposta possui uma resposta em vídeo/);
  assert.equal(
    copy.blockedDescription.split("\n\n")[1],
    "Para preservar o conteúdo compartilhado pelos profissionais, comentários com vídeos de psicólogos não podem ser excluídos.",
  );
  assert.match(copy.blockedDescription, /Você pode silenciar a conversa/);
});

test("comentário preserva concordância masculina e avisos de descendentes", () => {
  const professional = replyCopy({ kind: "comentário", isPsychologist: true });
  assert.equal(professional.deleteTitle, "Excluir comentário?");
  assert.equal(professional.blockedTitle, "Não é possível excluir este comentário");
  assert.equal("preservedTitle" in professional, false);
  assert.match(professional.blockedDescription, /^Este comentário possui uma resposta em vídeo/);
  assert.match(professional.deleteDescription, /^Este comentário e as respostas/);
  assert.match(professional.deleteDescription, /abaixo dele serão removidos/);
  const patient = replyCopy({ kind: "comentário", hasReplies: true });
  assert.match(patient.deleteDescription, /^Este comentário já possui respostas/);
  assert.match(patient.deleteDescription, /abaixo dele também serão removidas/);
});

test("folha de paciente sem descendentes conserva somente aviso irreversível", () => {
  for (const kind of ["resposta", "comentário"]) {
    assert.equal(replyCopy({ kind }).deleteDescription, "Esta ação não poderá ser desfeita.");
  }
});
