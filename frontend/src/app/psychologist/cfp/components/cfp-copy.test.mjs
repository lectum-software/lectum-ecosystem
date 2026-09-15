import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const layoutSource = readFileSync(
  fileURLToPath(new URL("./cfp-layout.tsx", import.meta.url)),
  "utf8",
);
const supportModuleSource = readFileSync(
  fileURLToPath(new URL("../modules/support.ts", import.meta.url)),
  "utf8",
);

test("suporte CFP nao repete orientacao manual antes do botao", () => {
  assert.equal(
    layoutSource.includes("Nossa equipe pode continuar a verificação manualmente pelo WhatsApp."),
    false,
  );
  assert.equal(layoutSource.includes("Fale com o suporte pelo WhatsApp"), true);
});

test("link de suporte CFP usa o WhatsApp operacional atualizado", () => {
  assert.equal(supportModuleSource.includes("5511936220962"), true);
  const previousSupportPhone = ["5537", "998739534"].join("");
  assert.equal(supportModuleSource.includes(previousSupportPhone), false);
});
