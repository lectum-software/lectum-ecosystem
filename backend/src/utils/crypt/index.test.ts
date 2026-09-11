import assert from "node:assert/strict";
import test from "node:test";
import { comparePasswordOrDummy, encrypt } from "./index";

test("executa comparação segura e rejeita conta sem hash", async () => {
  assert.equal(await comparePasswordOrDummy("qualquer-senha", null), false);
});

test("aceita um hash bcrypt válido", async () => {
  const hash = "$2b$10$3NsORax.HVOAN5tLfwMzqO1gaW5Bo7vcmAB6QDr3KmMXqzsuKQU4G";

  assert.equal(await comparePasswordOrDummy("lectum-auth-timing-placeholder-v1", hash), true);
});

test("novas senhas acima de 72 bytes preservam o sufixo inteiro", async () => {
  const prefix = "a".repeat(72);
  const hash = await encrypt(`${prefix}A`);

  assert.equal(await comparePasswordOrDummy(`${prefix}A`, hash), true);
  assert.equal(await comparePasswordOrDummy(`${prefix}B`, hash), false);
  assert.equal(await comparePasswordOrDummy(prefix, hash), false);
  assert.ok(hash.startsWith("$argon2id$"));
});

test("o limite de bcrypt considera bytes UTF-8, não número de caracteres", async () => {
  const prefix = "é".repeat(36);
  const hash = await encrypt(`${prefix}correta`);

  assert.equal(await comparePasswordOrDummy(`${prefix}correta`, hash), true);
  assert.equal(await comparePasswordOrDummy(`${prefix}outra`, hash), false);
  assert.ok(hash.startsWith("$argon2id$"));
});

test("preserva todos os 128 caracteres e espaços de uma nova senha", async () => {
  const password = ` ${"x".repeat(125)}  `;
  const hash = await encrypt(password);

  assert.equal(password.length, 128);
  assert.equal(await comparePasswordOrDummy(password, hash), true);
  assert.equal(await comparePasswordOrDummy(password.trim(), hash), false);
  assert.equal(await comparePasswordOrDummy(`${password.slice(0, -1)}X`, hash), false);
});

test("senhas no limite de 72 bytes continuam verificáveis", async () => {
  const password = "é".repeat(36);
  const hash = await encrypt(password);

  assert.equal(await comparePasswordOrDummy(password, hash), true);
  assert.equal(await comparePasswordOrDummy(`${"é".repeat(35)}a`, hash), false);
});
