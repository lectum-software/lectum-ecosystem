import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const url = new URL(
  "../src/app/(admin)/psicologos/%5Bid%5D/modules/tabs/statistics/acquired-patients.tsx",
  import.meta.url,
);
const source = readFileSync(url, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", compiled)(createRequire(url), loaded, loaded.exports);
const { AcquiredPatientsCard, AcquiredPatientsSection } = loaded.exports;
const render = (component, data) => renderToStaticMarkup(createElement(component, { data }));

test("admin distingue ausência e zero, com autoria informada", () => {
  assert.match(render(AcquiredPatientsCard, undefined), /—/);
  const html = render(AcquiredPatientsCard, { acquired_patients: 0, unanswered_weeks: 1 });
  assert.match(html, />0<\/p>/);
  assert.match(html, /Dados informados pelo psicólogo/);
  assert.match(html, /1 semana pendente/);
});

test("histórico usa semana de origem, pendência e data da resposta", () => {
  const html = render(AcquiredPatientsSection, {
    acquired_patients: null,
    answered_weeks: 0,
    unanswered_weeks: 1,
    total_weeks: 1,
    weeks: [
      {
        id: "local",
        week_start: "2026-10-12T03:00:00Z",
        week_end: "2026-10-19T03:00:00Z",
        people_count: 3,
        acquired_count: null,
        answered_at: null,
      },
    ],
  });
  assert.match(html, /12\/10\/2026 a 18\/10\/2026/);
  assert.match(html, /Pendente/);
  assert.match(html, />—<\/td>/);
  assert.doesNotMatch(html, /<button|<input/);
});

test("indicador está no carrossel de Conversão logo depois de WhatsApp", () => {
  const wiring = readFileSync(
    new URL(
      "../src/app/(admin)/psicologos/%5Bid%5D/modules/tabs/statistics/index.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(wiring, /config\.id === "whatsapp_clicks"[\s\S]*?id: "acquired_patients"/);
  assert.match(
    wiring,
    /<AcquiredPatientsSection data=\{businessStatistics\.whatsapp_reports\} \/>[\s\r\n]*<\/CardShell>/,
  );
});
