import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const layoutSource = readFileSync(
  fileURLToPath(new URL("./cfp-layout.tsx", import.meta.url)),
  "utf8",
);

test("suporte CFP nao repete orientacao manual antes do botao", () => {
  assert.equal(
    layoutSource.includes("Nossa equipe pode continuar a verificação manualmente pelo WhatsApp."),
    false,
  );
  assert.equal(layoutSource.includes("Fale com o suporte pelo WhatsApp"), true);
});
