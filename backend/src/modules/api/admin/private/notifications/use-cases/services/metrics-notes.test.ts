import assert from "node:assert/strict";
import test from "node:test";
import { notificationMetricsNotes } from "./metrics-notes";

test("BA05: nota de e-mail em PT-BR não confunde aceite com leitura", () => {
  const [email] = notificationMetricsNotes();
  assert.match(email, /Campanhas manuais por e-mail/);
  assert.match(email, /configurado/);
  assert.match(email, /alcance considera os envios aceitos pelo servidor de e-mail/);
});

test("BA05: abertura e clique mantêm ressalva de eventos registrados e cobertura de e-mail", () => {
  const [, , events] = notificationMetricsNotes();
  assert.match(events, /taxas de abertura\/leitura e clique/);
  assert.match(events, /apenas eventos registrados/);
  assert.match(events, /aberturas e cliques em e-mails ainda não são rastreados/);
});

test("BA05: público ativo e não excluído é explicado sem nomes internos de colunas", () => {
  const [, , , audience] = notificationMetricsNotes();
  assert.equal(audience, "O público considera apenas usuários ativos e não excluídos.");
  assert.doesNotMatch(
    notificationMetricsNotes().join(" "),
    /user\.active|deleted=false|read_at|clicked_at/,
  );
});

test("BA05: preserva nota de push, ordem, quantidade e isolamento entre respostas", () => {
  const first = notificationMetricsNotes();
  assert.equal(first.length, 4);
  assert.equal(
    first[1],
    "O alcance por push considera somente envios concluídos; dispositivos sem permissão ou assinatura ativa são ignorados.",
  );
  const second = notificationMetricsNotes();
  assert.notEqual(first, second);
  first.pop();
  assert.equal(second.length, 4);
});
