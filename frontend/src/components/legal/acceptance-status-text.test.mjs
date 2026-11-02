import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptanceStatusText } from "./acceptance-status-text.ts";

test("usa a data real no fuso brasileiro e distingue aceite de ciencia", () => {
  assert.equal(
    acceptanceStatusText("terms", "2026-11-03T01:00:00Z"),
    "Você aceitou esta versão em 02/11/2026.",
  );
  assert.equal(
    acceptanceStatusText("privacy", "2026-11-03T01:00:00Z"),
    "Você confirmou ciência desta versão em 02/11/2026.",
  );
  assert.equal(acceptanceStatusText("terms"), "Esta versão ainda não foi confirmada por você.");
});
