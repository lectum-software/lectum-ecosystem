import "./register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { InvoiceAction } = await import(
  "../src/app/app/professional/billing/components/invoice-action.tsx"
);
const render = (changes = {}) =>
  renderToStaticMarkup(
    createElement(InvoiceAction, {
      invoice: {
        id: "render-only",
        number: null,
        status: "authorized",
        mode: "live",
        downloadable: true,
        ...changes,
      },
    }),
  );

test("authorized live invoice renders only its download action", () => {
  const html = render();
  assert.match(html, /Baixar nota fiscal/);
  assert.match(html, /aria-label="Baixar nota fiscal em PDF"/);
  assert.match(html, /class="mt-1 grid/);
  assert.match(html, /min-h-6/);
  assert.ok(html.includes("text-[11px]"));
  assert.ok(html.includes("h-3.5 w-3.5"));
  assert.match(html, /justify-self-end/);
  assert.match(html, />Nota fiscal<\/button>/);
  assert.doesNotMatch(html, /min-h-11/);
  assert.doesNotMatch(html, /<p>|Nota fiscal autorizada|sem valor fiscal|de teste/);
});

test("actual test invoices retain their identification, without redundant authorized status", () => {
  const html = render({ mode: "test" });
  assert.match(html, /Teste · sem valor fiscal/);
  assert.match(html, /Baixar nota fiscal de teste em PDF/);
  assert.doesNotMatch(html, /Nota fiscal autorizada/);
});

test("pending invoices retain status and never offer download", () => {
  for (const status of ["queued", "processing", "awaiting_configuration", "rejected"]) {
    const html = render({ status });
    assert.match(html, /<p>/);
    assert.doesNotMatch(html, /<button|sem valor fiscal/);
  }
});

test("authorization without an available PDF retains a pending availability message", () => {
  const html = render({ downloadable: false });
  assert.match(html, /Nota fiscal aguardando disponibilização/);
  assert.doesNotMatch(html, /<button|Nota fiscal autorizada/);
});
