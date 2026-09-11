import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import "../../../../../scripts/register-source-modules.mjs";

const { ResultCard } = await import("./result-card.tsx");
// Props de apresentação sem identidade/registro; não simula busca ou aprovação CFP.
const result = {
  key: "presentation-only",
  nome: null,
  nome_regional: null,
  registro: null,
  situacao: null,
  data_inscricao: null,
  active: false,
};

for (const disabled of [true, false]) {
  test(`card real ${disabled ? "bloqueia" : "libera"} seleção conforme operação pendente`, () => {
    const html = renderToStaticMarkup(
      createElement(ResultCard, { result, selected: true, disabled, onSelect: () => {} }),
    );
    const button = html.match(/^<button\b[^>]*>/)?.[0] ?? "";
    assert.match(button, /aria-pressed="true"/);
    assert.equal(button.includes('disabled=""'), disabled);
    assert.match(html, /Nome não informado/);
  });
}

test("composição bloqueia reinício, envio e mudança de seleção durante confirmação", () => {
  const logic = readFileSync(new URL("../logic.tsx", import.meta.url), "utf8");
  for (const method of ["resetSearch", "handleSubmit", "handleConfirm"]) {
    const body = logic.split(`const ${method} =`)[1]?.split("};")[0] ?? "";
    assert.match(body, /if \(confirm\.isPending \|\| search\.isPending/);
  }
  assert.match(logic, /if \(!confirm\.isPending\) setSelectedKey\(key\)/);
  assert.match(logic, /check_id: searchResult\.check_id,\s*result_key: selectedKey/);
});

test("composição mantém confirmação e reinício indisponíveis e propaga pending aos cards", () => {
  const source = readFileSync(new URL("./result-screens.tsx", import.meta.url), "utf8");
  assert.match(source, /disabled=\{!selected\?\.active \|\| isConfirming\}/);
  assert.match(source, /disabled=\{isConfirming\}\s+onClick=\{onRetry\}/);
  assert.match(source, /<ResultCard[\s\S]*?disabled=\{isConfirming\}/);
});
