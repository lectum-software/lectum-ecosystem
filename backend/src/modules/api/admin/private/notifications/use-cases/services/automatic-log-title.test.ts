import assert from "node:assert/strict";
import { before, test } from "node:test";
import { setTimeout } from "node:timers/promises";
import { messages } from "@/main/notification/constants";
import i18next from "@/main/server/i18n";
import { resolveAutomaticLogTitle } from "./automatic-log-title";

before(async () => {
  const deadline = Date.now() + 2_000;
  while (!i18next.isInitialized && Date.now() < deadline) await setTimeout(20);
  assert.equal(i18next.isInitialized, true, "O catálogo local deve estar carregado.");
});

const inheritedKeys = ["constructor", "toString", "valueOf", "__proto__", "hasOwnProperty"];
const unavailableTitle = "Título não disponível";

for (const key of inheritedKeys) {
  test(`título de log não executa a chave herdada ${key}`, () => {
    assert.equal(Object.hasOwn(messages, key), false);
    assert.equal(
      resolveAutomaticLogTitle({
        metadata: null,
        notification: { message_key: key, message_props: null },
        trigger_key: null,
      }),
      unavailableTitle,
    );
  });
}

test("chaves herdadas de metadata e trigger também usam fallback textual", () => {
  for (const key of inheritedKeys) {
    for (const source of [
      { metadata: { message_key: key }, trigger_key: null },
      { metadata: null, trigger_key: key },
    ]) {
      assert.equal(resolveAutomaticLogTitle({ ...source, notification: null }), unavailableTitle);
    }
  }
});

test("todos os builders próprios continuam resolvendo o catálogo real", () => {
  for (const [key, build] of Object.entries(messages)) {
    assert.equal(
      resolveAutomaticLogTitle({
        metadata: null,
        notification: { message_key: key, message_props: {} },
        trigger_key: null,
      }),
      build({}).title.trim().slice(0, 120),
    );
  }
});

test("título canônico é humano em PT-BR", () => {
  assert.equal(
    resolveAutomaticLogTitle({
      metadata: null,
      notification: { message_key: "novo_post", message_props: null },
      trigger_key: null,
    }),
    "Novo post na comunidade",
  );
});

test("snapshot de metadata tem precedência sobre título e mensagem atuais", () => {
  assert.equal(
    resolveAutomaticLogTitle({
      metadata: { notification_title: "  Título registrado  ", title: "Título alternativo" },
      notification: { message_key: "novo_post", message_props: { title: "Título da notificação" } },
      trigger_key: "nova_resposta",
    }),
    "Título registrado",
  );
});

test("alias de título legado em metadata permanece válido", () => {
  assert.equal(
    resolveAutomaticLogTitle({
      metadata: { notification_title: " \t ", title: "  Título legado  " },
      notification: null,
      trigger_key: null,
    }),
    "Título legado",
  );
});

test("título explícito da notificação independe de chave conhecida ou herdada", () => {
  for (const key of ["evento_legado", ...inheritedKeys]) {
    assert.equal(
      resolveAutomaticLogTitle({
        metadata: null,
        notification: { message_key: key, message_props: { title: "  Título preservado  " } },
        trigger_key: null,
      }),
      "Título preservado",
    );
  }
});

test("mensagem inválida permite o fallback canônico de metadata", () => {
  assert.equal(
    resolveAutomaticLogTitle({
      metadata: { message_key: "nova_resposta", message_props: {} },
      notification: { message_key: "constructor", message_props: {} },
      trigger_key: null,
    }),
    "Nova resposta no post",
  );
});

test("aliases legados de props e trigger continuam disponíveis", () => {
  for (const propsKey of ["message_props", "notification_props"]) {
    assert.equal(
      resolveAutomaticLogTitle({
        metadata: { [propsKey]: { title: "  Registro legado  " } },
        notification: null,
        trigger_key: "evento_legado",
      }),
      "Registro legado",
    );
  }
});

test("chaves ausentes, desconhecidas e vazias usam fallback sem normalização nova", () => {
  for (const key of [null, "", " \t ", "evento_legado", "Novo_Post", "toString_normalizado"]) {
    assert.equal(
      resolveAutomaticLogTitle({ metadata: null, notification: null, trigger_key: key }),
      unavailableTitle,
    );
  }
});

test("valores JSON sem título textual não vazam como título", () => {
  for (const value of [null, [], "texto", 42, false, { title: 42 }, { title: " \n " }]) {
    assert.equal(
      resolveAutomaticLogTitle({
        metadata: value,
        notification: { message_key: "evento_legado", message_props: value },
        trigger_key: null,
      }),
      unavailableTitle,
    );
  }
});

test("limite de 120 caracteres e ausência de mutação são preservados", () => {
  const title = `  ${"a".repeat(121)}  `;
  const input = {
    metadata: { notification_title: title },
    notification: { message_key: "admin_campaign", message_props: { title } },
    trigger_key: null,
  };
  const snapshot = structuredClone(input);
  assert.equal(resolveAutomaticLogTitle(input), "a".repeat(120));
  assert.equal(resolveAutomaticLogTitle({ ...input, metadata: null }), "a".repeat(120));
  assert.deepEqual(input, snapshot);
});
