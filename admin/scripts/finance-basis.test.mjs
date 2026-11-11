import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const src = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const hook = registerHooks({
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
        `${local}/index.ts`,
        `${local}/index.tsx`,
      ].find((path) => existsSync(path) && /\.(ts|tsx)$/.test(path));
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
let FinancialBasisPanel,
  ChargeStatusBadge,
  PaymentHistoryStatusBadge,
  PaymentHealthDetails,
  hasLocalFinancialBasis,
  formatLocalFinancialObservation,
  formatStartDate,
  formatCancellationDate,
  formatCivilFinanceDate;
try {
  const load = createRequire(import.meta.url);
  const root = resolve(src, "app/(admin)/financeiro");
  ({ FinancialBasisPanel } = load(resolve(root, "components/financial-basis.tsx")));
  ({ ChargeStatusBadge } = load(resolve(root, "components/subscription-lists.tsx")));
  ({ PaymentHistoryStatusBadge, PaymentHealthDetails } = load(
    resolve(root, "assinaturas/components/payment-details.tsx"),
  ));
  ({ formatStartDate, formatCancellationDate } = load(
    resolve(root, "assinaturas/modules/subscription-support.tsx"),
  ));
  ({ formatDate: formatCivilFinanceDate } = load(resolve(root, "modules/finance-support.ts")));
  ({ hasLocalFinancialBasis, formatLocalFinancialObservation } = load(
    resolve(root, "modules/financial-basis.ts"),
  ));
} finally {
  hook.deregister();
}
const valid = {
  kind: "local_gross_receipts",
  available: true,
  observed_at: "2026-11-11T02:30:00.000Z",
  provider_coverage: "not_checked",
  gross_receipts_cents: 5980,
  refund_snapshot_cents: 2990,
  refund_snapshot_scope: "stripe_receipts",
  fees_available: false,
  net_cash_flow_available: false,
  note: "Bruto local e estornos atuais dos recibos Stripe; não são ajustes datados.",
};
const render = (basis, available = true) =>
  renderToStaticMarkup(
    createElement(FinancialBasisPanel, {
      dashboard: { financial_basis: basis, cards: { revenue_total: { available } } },
    }),
  );

test("old backend without the additive basis remains compatible", () => {
  assert.equal(render(undefined), "");
  assert.equal(render(null), "");
});
test("financial basis fails closed for unknown scope, unsafe cents or fake fee completeness", () => {
  assert.equal(hasLocalFinancialBasis(valid), true);
  for (const patch of [
    { available: undefined },
    { kind: "provider_balance" },
    { refund_snapshot_scope: "all_gateways" },
    { fees_available: true },
    { net_cash_flow_available: true },
    { observed_at: "invalid" },
    { gross_receipts_cents: -1 },
    { gross_receipts_cents: 0.1 },
    { gross_receipts_cents: Number.MAX_SAFE_INTEGER + 1 },
    { refund_snapshot_cents: 5981 },
    { note: "" },
    { note: "x".repeat(1201) },
  ]) {
    assert.equal(hasLocalFinancialBasis({ ...valid, ...patch }), false);
    assert.equal(render({ ...valid, ...patch }), "");
  }
});
test("local gross and Stripe-only accumulated refund are not rendered as profit or settlement", () => {
  const markup = render(valid);
  assert.match(markup, /Bruto registrado no período · todos os gateways/);
  assert.match(markup, /Estornos observados · Stripe/);
  assert.match(markup, /59,80/);
  assert.match(markup, /29,90/);
  assert.match(markup, /Tarifas e fluxo de caixa líquido não apurados/);
  assert.match(markup, /não verifica o saldo/);
  assert.match(markup, /nem representa lucro/);
});
test("unavailable projections do not replace unknown amounts with zero", () => {
  for (const markup of [render({ ...valid, available: false }), render(valid, false)]) {
    assert.equal((markup.match(/Indisponível/g) ?? []).length, 2);
    assert.doesNotMatch(markup, /59,80|29,90|0,00/);
  }
  assert.match(render({ ...valid, gross_receipts_cents: 0, refund_snapshot_cents: 0 }), /0,00/);
});
test("local consultation timestamp uses BRT independently from server timezone", () => {
  assert.match(formatLocalFinancialObservation(valid.observed_at), /10\/11\/2026.*23:30/);
  assert.equal(formatLocalFinancialObservation("invalid"), "Data indisponível");
});
test("refunded and disputed receipts do not retain a paid green badge", () => {
  for (const Component of [ChargeStatusBadge, PaymentHistoryStatusBadge]) {
    const refunded = renderToStaticMarkup(
      createElement(Component, {
        item: {
          gateway: "stripe",
          financial_status: "refunded",
          status: "successful",
          status_label: "Pago",
          amount_available: true,
        },
      }),
    );
    assert.match(refunded, /Estornado/);
    assert.doesNotMatch(refunded, /text-success/);
    const disputed = renderToStaticMarkup(
      createElement(Component, {
        item: {
          gateway: "stripe",
          financial_status: "disputed",
          status: "successful",
          status_label: "Pago",
          amount_available: true,
        },
      }),
    );
    assert.match(disputed, /Em disputa/);
    assert.doesNotMatch(disputed, /text-success/);
    const legacy = renderToStaticMarkup(
      createElement(Component, {
        item: {
          gateway: "mercadopago",
          status: "successful",
          status_label: "Confirmada",
          amount_available: true,
        },
      }),
    );
    assert.match(legacy, /Confirmada/);
    assert.match(legacy, /text-success/);
  }
});

test("Stripe capture history does not render absent attempt metrics as zero or 100 percent", () => {
  const markup = renderToStaticMarkup(
    createElement(PaymentHealthDetails, {
      item: {
        gateway: "stripe",
        status: "ativa",
        status_label: "Ativa",
        cancelled_at: null,
        payment_method: null,
        payment_health: {
          notes: [],
          summary: "Histórico de tentativas indisponível",
          success_rate_percent: 100,
          final_attempts: 0,
          consecutive_failures: 0,
          days_overdue: null,
          successful_payments: 0,
          failed_payments: 0,
          pending_payments: 0,
          last_success_at: "2026-11-11T02:30:00Z",
        },
        payment_history: { available: false, reason: "Sem histórico elegível.", items: [] },
      },
    }),
  );
  assert.match(markup, /Não apurad/);
  assert.match(markup, /Último recebimento/);
  assert.match(markup, /não todas as tentativas e recusas/);
  assert.doesNotMatch(markup, /100%/);
  assert.doesNotMatch(markup, /<dd[^>]*>0<\/dd>/);
});

test("Stripe start and cancellation do not infer observed dates from reservation or update timestamps", () => {
  const item = {
    gateway: "stripe",
    started_at: "2026-11-11T02:30:00.000Z",
    updated_at: "2026-11-12T15:00:00.000Z",
    cancelled_at: null,
    started_at_available: false,
  };
  assert.equal(formatStartDate(item), "Indisponível");
  assert.equal(formatCancellationDate(item), "Indisponível");
  assert.equal(formatStartDate({ ...item, started_at_available: true }), "10/11/2026");
  assert.equal(formatCancellationDate({ ...item, cancelled_at: item.started_at }), "10/11/2026");
  assert.equal(formatCancellationDate({ ...item, gateway: "mercadopago" }), "12/11/2026");
});

test("civil finance dates retain their day without server-local midnight", () => {
  assert.match(formatCivilFinanceDate("2026-11-10"), /10/);
  assert.equal(formatCivilFinanceDate("2026-02-30"), "—");
});
