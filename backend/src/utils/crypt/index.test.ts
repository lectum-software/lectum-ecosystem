import assert from "node:assert/strict";
import test from "node:test";
import { comparePasswordOrDummy } from "./index";

test("executa comparação segura e rejeita conta sem hash", async () => {
  assert.equal(await comparePasswordOrDummy("qualquer-senha", null), false);
});

test("aceita um hash bcrypt válido", async () => {
  const hash = "$2b$10$3NsORax.HVOAN5tLfwMzqO1gaW5Bo7vcmAB6QDr3KmMXqzsuKQU4G";

  assert.equal(await comparePasswordOrDummy("lectum-auth-timing-placeholder-v1", hash), true);
});
