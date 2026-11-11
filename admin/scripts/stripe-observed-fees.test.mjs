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
const hook = registerHooks({
  resolve(specifier, context, next) {
    const local = specifier.startsWith("@/")
      ? resolve(src, specifier.slice(2))
      : specifier.startsWith(".") && context.parentURL?.startsWith(pathToFileURL(src).href)
        ? resolve(dirname(fileURLToPath(context.parentURL)), specifier)
        : null;
    const target =
      local &&
      [local, `${local}.ts`, `${local}.tsx`, `${local}/index.ts`, `${local}/index.tsx`].find(
        (path) => existsSync(path) && /\.tsx?$/.test(path),
      );
    return next(target || specifier, context);
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
let policy, FeeFilters, StripeFeeSummary, StripeFeeTable, FeeTransactions;
try {
  const load = createRequire(import.meta.url);
  const base = resolve(src, "app/(admin)/financeiro/tarifas");
  policy = load(resolve(base, "modules/fee-policy.ts"));
  ({ FeeFilters } = load(resolve(base, "components/filters.tsx")));
  ({ StripeFeeSummary } = load(resolve(base, "components/summary.tsx")));
  ({ StripeFeeTable } = load(resolve(base, "components/table.tsx")));
  ({ FeeTransactions } = load(resolve(base, "components/transactions.tsx")));
} finally {
  hook.deregister();
}
const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));
const neverObserveDuringRender = () =>
  assert.fail("Rendering must not initiate provider observation");
// Policy/SSR fixtures only. They are not external evidence of refunds or disputes in the sandbox.
const capture = {
  id_local: "fact-local",
  kind: "capture",
  occurred_at: "2026-11-10T18:00:00Z",
  available_on: "2026-11-13T15:00:00Z",
  amount_cents: 2990,
  fee_cents: 158,
  net_cents: 2832,
  status: "pending",
};
const item = {
  receipt_id: "receipt-local",
  paid_at: "2026-11-11T05:00:00Z",
  amount_paid_cents: 2990,
  financial_status: "refunded",
  can_refresh: true,
  capture: {
    available: true,
    fee_cents: 158,
    net_cents: 2832,
    observed_at: "2026-11-11T18:00:00Z",
    status: "pending",
  },
  transactions: [capture],
  coverage: {
    state: "partial",
    capture_verified: true,
    refunds_scanned: true,
    disputes_scanned: false,
    has_more: false,
    last_observed_at: "2026-11-11T18:00:00Z",
    last_error_code: "read_access_denied",
  },
};
const data = {
  mode: "test",
  items: [item],
  pagination: { page: 1, limit: 20, total: 2, total_pages: 1 },
  summary: {
    available: true,
    receipt_count: 2,
    eligible_gross_cents: 5980,
    capture_verified_count: 1,
    capture_missing_count: 1,
    observed_capture_gross_cents: 2990,
    observed_capture_fee_cents: 158,
    observed_capture_net_cents: 2832,
    observed_adjustment_fee_cents: null,
    transaction_count: 1,
  },
  coverage: {
    complete: false,
    account_costs_complete: false,
    net_cash_flow_available: false,
    profit_available: false,
    note: "Observação local parcial, antes dos ajustes financeiros.",
  },
};

test("fee filters use civil dates, strict supported URL fields and bounded pagination without broadening invalid queries", () => {
  assert.deepEqual(policy.resolveFeeQuery(new URLSearchParams()).query, { page: 1, limit: 20 });
  assert.equal(
    policy.resolveFeeQuery(new URLSearchParams("from=2000-02-29&to=2100-12-31&page=2&limit=8"))
      .valid,
    true,
  );
  for (const raw of [
    "from=1999-12-31",
    "to=2101-01-01",
    "from=2100-02-29",
    "from=2026-11-12&to=2026-11-10",
    "from=bad",
    "page=0",
    "limit=51",
    "status=paid",
    "mode=live",
    "account_id=forbidden",
  ])
    assert.equal(policy.resolveFeeQuery(new URLSearchParams(raw)).valid, false, raw);
  assert.equal(policy.feeFilterSchema.safeParse({ from: "", to: "" }).success, true);
  assert.equal(
    policy.feeFilterSchema.safeParse({ from: "2026-11-12", to: "2026-11-10" }).success,
    false,
  );
});
test("signed canonical monetary values and actual zero are supported, missing/unsafe values are never rounded or coerced", () => {
  assert.match(policy.formatFeeMoney(158), /1,58/);
  assert.match(policy.formatFeeMoney(-158), /-.*1,58/);
  assert.match(policy.formatFeeMoney(0), /0,00/);
  for (const value of [null, undefined, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1, "158"])
    assert.equal(policy.formatFeeMoney(value), "Não observado");
  assert.deepEqual(
    policy.feeCaptureValues({ ...item, coverage: { ...item.coverage, capture_verified: false } }),
    { fee: null, net: null },
  );
  assert.deepEqual(
    policy.feeCaptureValues({
      ...item,
      capture: { ...item.capture, available: false, fee_cents: 0 },
    }),
    { fee: null, net: null },
  );
  assert.deepEqual(
    policy.feeCaptureValues({ ...item, capture: { ...item.capture, fee_cents: 0 } }),
    { fee: 0, net: 2832 },
  );
});
test("receipt and balance dates are distinct, explicitly displayed in BRT, without renaming allocation as capture", () => {
  assert.match(policy.formatFeeDate("2026-11-11T01:30:00Z"), /10\/11\/2026/);
  assert.match(policy.formatFeeDate(item.paid_at), /11\/11\/2026/);
  assert.match(policy.formatFeeDate(capture.occurred_at), /10\/11\/2026/);
  assert.equal(policy.formatFeeDate(null), "Não observado");
});
test("observation labels are stage-bound, completed scans can be observed again and unknown diagnostics remain closed", () => {
  assert.equal(policy.feeObserveLabel(item), "Continuar observação");
  assert.equal(
    policy.feeObserveLabel({
      ...item,
      coverage: { ...item.coverage, state: "not_observed", has_more: false },
    }),
    "Observar taxas",
  );
  assert.equal(
    policy.feeObserveLabel({
      ...item,
      coverage: { ...item.coverage, state: "observed", has_more: false },
    }),
    "Observar taxas",
  );
  assert.equal(
    policy.feeObserveLabel({
      ...item,
      coverage: { ...item.coverage, state: "processing", has_more: true },
    }),
    "Continuar observação",
  );
  for (const raw of ["constructor", "__proto__", "PRIVATE_PROVIDER_MESSAGE"]) {
    assert.equal(policy.feeStateLabel(raw), "Observação não comprovada");
    assert.equal(policy.balanceKindLabel(raw), "Movimento não classificado");
    assert.equal(policy.feeDiagnosticLabel(raw).includes(raw), false);
  }
});
test("real summary keeps eligible and observed gross separate, shows partial coverage and never claims profit/account completeness", () => {
  const html = render(StripeFeeSummary, { data });
  for (const amount of ["59,80", "29,90", "1,58", "28,32"]) assert.match(html, new RegExp(amount));
  assert.match(html, /1 de 2 recibos/);
  assert.match(html, /1 sem captura comprovada/);
  assert.match(html, /Bruto de todos os recibos elegíveis/);
  assert.match(html, /somente às capturas observadas/);
  assert.match(html, /antes dos ajustes/);
  assert.match(html, /não representa lucro, repasse nem saldo disponível/);
  assert.match(html, /Não observado/);
  assert.doesNotMatch(html, /0,00|100%|lucro líquido apurado/i);
});
test("unavailable summary never leaks numeric partial totals as authoritative, while actual observed credits stay signed", () => {
  const unavailable = render(StripeFeeSummary, {
    data: { ...data, summary: { ...data.summary, available: false } },
  });
  assert.match(unavailable, /Indisponível/);
  assert.doesNotMatch(unavailable, /59,80|29,90|1,58|28,32/);
  const credit = render(StripeFeeSummary, {
    data: { ...data, summary: { ...data.summary, observed_adjustment_fee_cents: -158 } },
  });
  assert.match(credit, /-.*1,58/);
  assert.match(credit, /Créditos de tarifa podem ser negativos/);
});
test("real responsive receipt table retains original capture fees after refund and does not observe during render", () => {
  const html = render(StripeFeeTable, {
    items: [item],
    busy: false,
    onObserve: neverObserveDuringRender,
  });
  assert.match(html, /Estornado/);
  assert.match(html, /1,58/);
  assert.match(html, /28,32/);
  assert.match(html, /Continuar observação/);
  assert.match(html, /Uma etapa por clique/);
  assert.match(html, /não efetua cobrança/);
  assert.match(html, /etapa não concluída/);
  assert.match(html, /lg:hidden/);
  assert.match(html, /hidden overflow-x-auto lg:block/);
  assert.doesNotMatch(html, /read_access_denied/);
});
test("unverified capture values remain unknown and live observations respect the server can_refresh gate", () => {
  const missing = {
    ...item,
    financial_status: "paid",
    can_refresh: false,
    capture: { ...item.capture, available: false, fee_cents: 0, net_cents: 0 },
    transactions: [],
    coverage: {
      ...item.coverage,
      state: "unavailable",
      capture_verified: false,
      last_error_code: "live_not_authorized",
    },
  };
  const html = render(StripeFeeTable, {
    items: [missing],
    busy: false,
    onObserve: neverObserveDuringRender,
  });
  assert.match(html, /Não observado/);
  assert.match(html, /disabled=""/);
  assert.match(html, /produção não está habilitada/);
  assert.doesNotMatch(html, /0,00/);
  const empty = render(StripeFeeTable, {
    items: [],
    busy: false,
    onObserve: neverObserveDuringRender,
  });
  assert.match(empty, /não comprova ausência de pagamentos ou custos/);
});
test("real balance detail supports refund/reversal/dispute signed facts and pending availability without payout claims", () => {
  const transactions = [
    capture,
    {
      ...capture,
      id_local: "refund-local",
      kind: "refund",
      amount_cents: -2990,
      fee_cents: -158,
      net_cents: -2832,
    },
    { ...capture, id_local: "reversal-local", kind: "refund_reversal" },
    {
      ...capture,
      id_local: "dispute-local",
      kind: "dispute",
      amount_cents: -2990,
      fee_cents: 1500,
      net_cents: -4490,
    },
  ];
  const html = render(FeeTransactions, { transactions });
  assert.match(html, /Reversão de estorno/);
  assert.match(html, /Ajuste de disputa/);
  assert.match(html, /-.*1,58/);
  assert.match(html, /-.*44,90/);
  assert.match(html, /Pendente na Stripe · não é saldo disponível/);
  assert.match(html, /não comprova saque ou repasse/);
  assert.match(html, /Ocorrência:.*10\/11\/2026/);
});
test("unknown provider fields and identifiers are not rendered by the actual detail or receipt components", () => {
  const privateFields = {
    account_id: "acct_PRIVATE",
    provider_transaction_id: "txn_PRIVATE",
    source_id: "re_PRIVATE",
    description: "PRIVATE_PROVIDER_DESCRIPTION",
  };
  const html = render(StripeFeeTable, {
    items: [{ ...item, ...privateFields, transactions: [{ ...capture, ...privateFields }] }],
    busy: false,
    onObserve: neverObserveDuringRender,
  });
  for (const value of Object.values(privateFields)) assert.equal(html.includes(value), false);
  assert.match(html, /Recibo local: receipt-local/);
});
test("cycle event cutoff and later observation time remain distinct, including an absent additive cutoff", () => {
  const props = { busy: false, onObserve: neverObserveDuringRender };
  const html = render(StripeFeeTable, {
    ...props,
    items: [
      {
        ...item,
        coverage: {
          ...item.coverage,
          cutoff_at: "2026-11-11T16:00:00Z",
          last_observed_at: "2026-11-11T18:00:00Z",
        },
      },
    ],
  });
  assert.match(html, /Objetos de estorno\/disputa criados até:.*13:00/s);
  assert.match(html, /Movimentos e disponibilidade têm datas próprias/);
  assert.match(html, /Última consulta:.*15:00/s);
  const legacy = render(StripeFeeTable, { ...props, items: [item] });
  assert.match(legacy, /Objetos de estorno\/disputa criados até: Não informado/);
  assert.match(legacy, /Última consulta:.*15:00/s);
});
test("real RHF filter controls use the receipt period, stable errors and no gateway/account selection", () => {
  const html = render(FeeFilters, {
    query: {},
    onApply: neverObserveDuringRender,
    onClear: neverObserveDuringRender,
  });
  assert.match(html, /Recebimentos de · BRT/);
  assert.match(html, /name="from"/);
  assert.match(html, /name="to"/);
  assert.match(html, /min-h-5/);
  assert.match(html, /independente da ocorrência/);
  assert.doesNotMatch(html, /name="(?:mode|account|status|gateway|secret)/);
});
