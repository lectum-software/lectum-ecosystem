import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const src = fileURLToPath(new URL("../src/", import.meta.url));
// Load the real production components, helpers, API client and library dependencies.
// No request is sent and no provider/hook is substituted in these unit/SSR tests.
const hooks = registerHooks({
  resolve(specifier, context, next) {
    const local = specifier.startsWith("@/")
      ? resolve(src, specifier.slice(2))
      : specifier.startsWith(".") && context.parentURL?.startsWith(pathToFileURL(src).href)
        ? resolve(dirname(fileURLToPath(context.parentURL)), specifier)
        : null;
    if (local) {
      const target = [
        local,
        `${local}.ts`,
        `${local}.tsx`,
        `${local}.mjs`,
        `${local}/index.ts`,
        `${local}/index.tsx`,
      ].find((path) => existsSync(path) && /\.(ts|tsx|mjs)$/.test(path));
      if (target) return next(target, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (!url.startsWith(pathToFileURL(src).href) || !/\.tsx?$/.test(url)) return next(url, context);
    return {
      format: "commonjs",
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        fileName: fileURLToPath(url),
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      shortCircuit: true,
    };
  },
});
let FinancialHistoryContent,
  FinancialHistoryTable,
  FinancialInvoiceAction,
  presentation,
  isValidInvoicePdf,
  parseQuery,
  adminFinanceKeys;
try {
  const load = createRequire(import.meta.url);
  ({ FinancialHistoryContent } = load(resolve(src, "components/finance-history/content.tsx")));
  ({ FinancialHistoryTable } = load(resolve(src, "components/finance-history/table.tsx")));
  ({ FinancialInvoiceAction } = load(
    resolve(src, "components/finance-history/invoice-action.tsx"),
  ));
  presentation = load(resolve(src, "components/finance-history/presentation.ts"));
  ({ isValidInvoicePdf } = load(resolve(src, "lib/invoice-pdf.ts")));
  ({ parseQuery } = load(
    resolve(src, "app/(admin)/financeiro/cobrancas/modules/charge-support.ts"),
  ));
  ({ adminFinanceKeys } = load(resolve(src, "api/cache/keys.ts")));
} finally {
  hooks.deregister();
}
const item = (overrides = {}) => ({
  id: "local-receipt-a",
  gateway: "stripe",
  mode: "test",
  user_id: "local-user-a",
  psychologist_id: "local-profile-a",
  display_name: "Pessoa de teste",
  subscription_id: "local-contract-a",
  occurred_at: "2026-11-10T12:00:00Z",
  amount_cents: 2990,
  currency: "BRL",
  financial_status: "paid",
  status_label: "Pago",
  description: "Pagamento da assinatura",
  source: "stripe_receipt",
  invoice: null,
  ...overrides,
});
const history = (overrides = {}) => ({
  items: [item()],
  pagination: { page: 1, limit: 10, total: 22, total_pages: 3 },
  coverage: {
    source: "local_records",
    remote_readiness: "not_checked",
    complete: false,
    reason: "local only",
  },
  ...overrides,
});
const renderContent = (props = {}) =>
  renderToStaticMarkup(
    createElement(FinancialHistoryContent, {
      data: history(),
      loading: false,
      failed: false,
      onRetry() {},
      onPageChange() {},
      onLimitChange() {},
      ...props,
    }),
  );
const invoice = (overrides = {}) => ({
  id: "invoice-local-a",
  status: "authorized",
  number: "123",
  mode: "live",
  downloadable: true,
  ...overrides,
});
const renderInvoice = (value, userId = "local-user-a") =>
  renderToStaticMarkup(createElement(FinancialInvoiceAction, { invoice: value, userId }));

test("histórico informa paginação local e cobertura externa não consultada", () => {
  const html = renderContent();
  assert.match(html, /22 registros locais/);
  assert.match(html, /Página 1 de 3/);
  assert.match(html, /registros locais elegíveis/);
  assert.match(html, /cobertura externa pode ser incompleta/);
  assert.match(html, /a nota fiscal são verificadas separadamente/);
  assert.match(html, /29,90/);
  assert.match(html, /Teste · sem cobrança real/);
});

test("backend antigo ou contrato inválido falha de forma honesta sem assumir histórico vazio", () => {
  for (const data of [undefined, {}, { items: [] }, history({ coverage: { complete: true } })]) {
    const html = renderContent({ data });
    assert.match(html, /Histórico financeiro indisponível/);
    assert.doesNotMatch(html, /Nenhum registro local encontrado|29,90/);
  }
});

test("loading descarta linhas anteriores inclusive os botões PDF", () => {
  const html = renderContent({
    loading: true,
    data: history({ items: [item({ invoice: invoice() })] }),
  });
  assert.match(html, /Consultando histórico/);
  assert.doesNotMatch(html, /29,90|Baixar PDF|Pagamento da assinatura/);
});

test("erro descarta resultados obsoletos e não expõe payload técnico", () => {
  const html = renderContent({ failed: true, data: history() });
  assert.match(html, /Nenhum pagamento ou nota fiscal foi alterado/);
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /29,90|Pagamento da assinatura|stripe_receipt/);
});

test("limite operacional recomenda refinar filtro em vez de truncar silenciosamente", () => {
  assert.match(renderContent({ failed: true, limitReached: true }), /Refine os filtros/);
});

test("vazio local não comprova ausência de pagamentos no gateway", () => {
  const html = renderContent({
    data: history({ items: [], pagination: { page: 1, limit: 10, total: 0, total_pages: 0 } }),
  });
  assert.match(html, /Nenhum registro local encontrado/);
  assert.match(html, /não comprova ausência de pagamentos/);
  assert.match(html, /Página 1 de 1/);
});

test("cards mobile e tabela desktop não mostram IDs externos, e-mail ou CPF recebidos por engano", () => {
  const html = renderToStaticMarkup(
    createElement(FinancialHistoryTable, {
      showPsychologist: true,
      items: [
        item({
          external_id: "external-secret-value",
          email: "secret@example.test",
          cpf: "private-cpf",
          provider_payload: "raw-provider-payload",
        }),
      ],
    }),
  );
  assert.match(html, /lg:hidden/);
  assert.match(html, /hidden overflow-x-auto lg:block/);
  assert.match(html, /Pessoa de teste/);
  assert.match(html, /\/psicologos\/local-user-a\?tab=plano/);
  assert.doesNotMatch(
    html,
    /external-secret-value|secret@example.test|private-cpf|raw-provider-payload|stripe_receipt/,
  );
});

test("valor usa centavos registrados, preserva moeda e não assume BRL quando ausente", () => {
  assert.match(presentation.formatHistoryMoney(1790, "BRL"), /17,90/);
  assert.match(presentation.formatHistoryMoney(1000, "USD"), /US\$/);
  for (const value of [
    [null, "BRL"],
    [NaN, "BRL"],
    [1.5, "BRL"],
    [2990, null],
    [2990, "<bad>"],
  ])
    assert.equal(presentation.formatHistoryMoney(...value), "Valor não informado");
});

test("status financeiros distinguem estorno/disputa de pagamento e evento processado", () => {
  assert.equal(presentation.financialStatusLabel("refunded"), "Estornado");
  assert.equal(presentation.financialStatusLabel("partially_refunded"), "Estornado parcialmente");
  assert.equal(presentation.financialStatusLabel("disputed"), "Em disputa");
  assert.equal(presentation.financialStatusLabel("processed"), "Evento processado");
  assert.equal(presentation.financialStatusLabel("constructor"), "Status não informado");
});

test("NF autorizada elegível oferece apenas download sem link externo ou mutação fiscal", () => {
  const html = renderInvoice(invoice());
  assert.match(html, /Autorizada/);
  assert.match(html, /Baixar NFS-e em PDF/);
  assert.match(html, /Baixar PDF/);
  assert.doesNotMatch(html, /href=|Emitir|Cobrar|Reemitir|invoice-local-a/);
});

for (const status of [
  "simulated",
  "rejected",
  "authorization_unverified",
  "cancelled",
  "manual_review",
  "unknown",
  "constructor",
  "__proto__",
]) {
  test(`NF ${status} não habilita download mesmo recebendo flag true`, () => {
    assert.doesNotMatch(renderInvoice(invoice({ status })), /Baixar PDF|<button/);
  });
}

test("NF de teste é explicitamente sem valor fiscal", () => {
  const html = renderInvoice(invoice({ mode: "test" }));
  assert.match(html, /Teste · sem valor fiscal/);
  assert.match(html, /Baixar NFS-e de teste em PDF/);
});

test("NF sem flag de download, sem dono ou modo desconhecido permanece fechada", () => {
  assert.doesNotMatch(renderInvoice(invoice({ downloadable: false })), /<button/);
  assert.doesNotMatch(renderInvoice(invoice(), ""), /<button/);
  assert.doesNotMatch(renderInvoice(invoice({ mode: "unexpected" })), /<button/);
  assert.doesNotMatch(renderInvoice(invoice({ downloadable: "true" })), /<button/);
  assert.match(renderInvoice(null), /Sem nota fiscal vinculada/);
});

test("datas e número fiscal inválidos não causam crash nem expõem texto arbitrário", () => {
  assert.equal(presentation.formatHistoryDate("invalid"), "Data não informada");
  assert.equal(presentation.formatInvoiceNumber("raw\nprovider-error"), null);
  assert.equal(presentation.formatInvoiceNumber("123"), "123");
  assert.match(presentation.formatHistoryDate("2026-11-10T12:00:00Z"), /09:00/);
});

test("paginações de começo/meio/fim preservam janela compacta", () => {
  assert.deepEqual(presentation.historyPageNumbers(1, 8), [1, 2, 3]);
  assert.deepEqual(presentation.historyPageNumbers(5, 8), [4, 5, 6]);
  assert.deepEqual(presentation.historyPageNumbers(8, 8), [6, 7, 8]);
  assert.deepEqual(presentation.historyPageNumbers(1, 0), []);
});

test("filtros antigos confirmed migram para paid; status desconhecido não é encaminhado", () => {
  assert.equal(parseQuery(new URLSearchParams("status=confirmed")).status, "paid");
  assert.equal(parseQuery(new URLSearchParams("status=refunded")).status, "refunded");
  assert.equal(parseQuery(new URLSearchParams("status=constructor")).status, undefined);
  assert.equal(parseQuery(new URLSearchParams("page=-3")).page, 1);
});

test("cache separa usuários, páginas e filtros", () => {
  const key = adminFinanceKeys.history({ user_id: "one", page: 1 });
  assert.notDeepEqual(key, adminFinanceKeys.history({ user_id: "two", page: 1 }));
  assert.notDeepEqual(key, adminFinanceKeys.history({ user_id: "one", page: 2 }));
  assert.notDeepEqual(key, adminFinanceKeys.history({ user_id: "one", page: 1, status: "paid" }));
});

test("validação binária exige MIME PDF, tamanho permitido e assinatura sem aceitar JSON/HTML", async () => {
  // Synthetic byte fixtures exercise the parser only; this is not an issued invoice or E2E proof.
  assert.equal(
    await isValidInvoicePdf(new Blob(["%PDF-1.7\n"], { type: "application/pdf" })),
    true,
  );
  assert.equal(await isValidInvoicePdf(new Blob(["%PDF-1.7\n"], { type: "text/html" })), false);
  assert.equal(
    await isValidInvoicePdf(new Blob(['{"error":"private"}'], { type: "application/pdf" })),
    false,
  );
  assert.equal(await isValidInvoicePdf(new Blob([], { type: "application/pdf" })), false);
  assert.equal(
    await isValidInvoicePdf(
      new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "application/pdf" }),
    ),
    false,
  );
  assert.equal(await isValidInvoicePdf(null), false);
});
