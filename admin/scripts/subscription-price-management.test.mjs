import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const resolveSource = (candidate) =>
  [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}/index.ts`,
    `${candidate}/index.tsx`,
  ].find((file) => /\.tsx?$/.test(file) && existsSync(file));
// Run the actual RHF/controllers/dialog/history components. No API, query hooks or providers are replaced.
const hooks = registerHooks({
  resolve(specifier, context, next) {
    const local = specifier.startsWith("@/")
      ? resolveSource(resolve(sourceRoot, specifier.slice(2)))
      : specifier.startsWith(".") && context.parentURL?.startsWith(pathToFileURL(sourceRoot).href)
        ? resolveSource(resolve(dirname(fileURLToPath(context.parentURL)), specifier))
        : null;
    return next(local ?? specifier, context);
  },
  load(url, context, next) {
    if (!url.startsWith(pathToFileURL(sourceRoot).href) || !/\.tsx?$/.test(url))
      return next(url, context);
    return {
      format: "commonjs",
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        fileName: fileURLToPath(url),
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      shortCircuit: true,
    };
  },
});
let policy, PriceCreateCard, PriceConfirmDialog, PriceHistory;
try {
  const load = createRequire(import.meta.url);
  const base = resolve(sourceRoot, "app/(admin)/configuracoes/assinatura");
  policy = load(resolve(base, "modules/price-management.ts"));
  ({ PriceCreateCard } = load(resolve(base, "components/price-create-card.tsx")));
  ({ PriceConfirmDialog } = load(resolve(base, "components/price-confirm-dialog.tsx")));
  ({ PriceHistory } = load(resolve(base, "components/price-history.tsx")));
} finally {
  hooks.deregister();
}
const neverMutateOnRender = () => assert.fail("A render must not perform a mutation");
const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));
const version = {
  id: "local-version-reference",
  amount_cents: 2990,
  currency: "BRL",
  interval: "month",
  interval_count: 1,
  created_at: "2026-11-11T15:00:00Z",
  is_current: false,
};
const operation = {
  id: "local-operation-reference",
  amount_cents: 2990,
  status: "pending",
  created_at: "2026-11-11T15:00:00Z",
  updated_at: "2026-11-11T15:00:00Z",
  version_id: null,
  can_resume: true,
};

test("parses BRL decimal text into integer cents without floats, thousands or exponents", () => {
  for (const [text, cents] of [
    ["0,50", 50],
    ["29,90", 2990],
    [" 29.9 ", 2990],
    ["29", 2900],
    ["999999,99", 99999999],
  ]) {
    assert.equal(policy.parseMonthlyPrice(text), cents);
    assert.equal(policy.priceFormSchema.safeParse({ amount: text }).success, true);
  }
  for (const text of [
    "",
    "0",
    "0,49",
    "-29,90",
    "1.000,00",
    "29,999",
    "1e3",
    "Infinity",
    "1000000",
    "R$ 29,90",
    "29,",
  ]) {
    assert.equal(policy.parseMonthlyPrice(text), null, text);
    assert.equal(policy.priceFormSchema.safeParse({ amount: text }).success, false, text);
  }
});

test("ambiguous creation recovery preserves the exact key and amount, never sends scope or operation fields", () => {
  const pending = {
    request_key: "410ec3e0-1e3d-4d8e-aafa-82fb21cc368a",
    amount_cents: 2990,
    operation_id: "local-operation",
  };
  const restored = policy.parsePendingPriceRequest(
    JSON.stringify({ ...pending, account_id: "forbidden", mode: "live", secret: "forbidden" }),
  );
  assert.deepEqual(restored, pending);
  const first = policy.toPriceCreationInput(restored);
  assert.deepEqual(first, {
    amount_cents: 2990,
    request_key: pending.request_key,
    confirm_new_adhesions_only: true,
  });
  assert.deepEqual(
    policy.toPriceCreationInput(policy.parsePendingPriceRequest(JSON.stringify(restored))),
    first,
  );
  for (const row of [
    null,
    "bad json",
    "{}",
    JSON.stringify({ ...pending, request_key: "bad" }),
    JSON.stringify({ ...pending, amount_cents: 0 }),
  ])
    assert.equal(policy.parsePendingPriceRequest(row), null);
});

test("publication requires explicit exact confirmation, operation states are conservative", () => {
  assert.equal(policy.publishFormSchema.safeParse({ confirmation: "PUBLICAR" }).success, true);
  for (const confirmation of ["", "publicar", "PUBLICAR ", "true"])
    assert.equal(policy.publishFormSchema.safeParse({ confirmation }).success, false);
  assert.equal(policy.priceOperationIsTerminal({ ...operation, status: "completed" }), true);
  assert.equal(
    policy.priceOperationIsTerminal({ ...operation, status: "manual_review", can_resume: false }),
    false,
  );
  assert.equal(
    policy.priceOperationIsTerminal({ ...operation, status: "failed", can_resume: false }),
    true,
  );
  assert.equal(
    policy.priceOperationIsTerminal({ ...operation, status: "failed", can_resume: true }),
    false,
  );
  for (const status of ["constructor", "__proto__", "unexpected"])
    assert.equal(policy.priceOperationLabel(status), "Situação indisponível");
});

test("corrupt saved requests fail closed for new creation and recovery is isolated by authenticated actor", () => {
  assert.deepEqual(policy.readPreservedPriceRequest(null), { pending: null, ready: true });
  for (const value of [
    "",
    "{}",
    "bad json",
    JSON.stringify({ amount_cents: 2990, request_key: "broken" }),
  ])
    assert.deepEqual(policy.readPreservedPriceRequest(value), { pending: null, ready: false });
  const a = policy.priceRequestStorageKey("admin-a", "plan-local", "test");
  assert.notEqual(a, policy.priceRequestStorageKey("admin-b", "plan-local", "test"));
  assert.notEqual(a, policy.priceRequestStorageKey("admin-a", "plan-local", "live"));
  assert.notEqual(a, policy.priceRequestStorageKey("admin-a", "other-plan", "test"));
  for (const actor of [null, "", "admin:injected", "a".repeat(129)])
    assert.equal(policy.priceRequestStorageKey(actor, "plan-local", "test"), null);
  assert.equal(policy.priceRequestStorageKey("admin-a", "plan-local", "unknown"), null);
});

test("local management scope preserves offline pause/revision while sales are disabled or price/SDK is unavailable", () => {
  const setting = {
    checkout: {
      gateway: "disabled",
      mode: null,
      status: "paused",
      offer: null,
      price: null,
      collection_enabled: false,
      reconciliation_enabled: false,
    },
    catalog: {
      gateway: "stripe",
      mode: "test",
      remote_readiness: "not_checked",
      offer: {
        revision: 7,
        checkout_enabled: true,
        price_version_id: "local-version",
        amount_cents: 3990,
      },
    },
  };
  const context = policy.getPriceManagementContext(setting);
  assert.equal(context.mode, "test");
  assert.equal(context.revision, 7);
  assert.equal(context.offer.checkout_enabled, true);
  assert.equal(context.amountCents, 3990);
  assert.equal(context.publishingReady, false);
  const broken = policy.getPriceManagementContext({
    ...setting,
    checkout: { ...setting.checkout, gateway: "stripe", status: "invalid_configuration" },
    catalog: { ...setting.catalog, offer: { ...setting.catalog.offer, amount_cents: null } },
  });
  assert.equal(broken.revision, 7);
  assert.equal(broken.offer.checkout_enabled, true);
  assert.equal(broken.amountCents, null);
  assert.equal(broken.publishingReady, false);
  const ready = policy.getPriceManagementContext({
    ...setting,
    checkout: {
      ...setting.checkout,
      gateway: "stripe",
      status: "paused",
      collection_enabled: true,
      reconciliation_enabled: true,
    },
  });
  assert.equal(ready.publishingReady, true);
  assert.equal(policy.getPriceManagementContext({}).publishingReady, false);
  assert.equal(
    policy.getPriceManagementContext({
      ...setting,
      catalog: { ...setting.catalog, remote_readiness: "unexpected" },
    }).offer,
    null,
  );
});

test("actor or catalog key transitions hide the previous saved request until the matching key has hydrated", () => {
  const pending = { request_key: "410ec3e0-1e3d-4d8e-aafa-82fb21cc368a", amount_cents: 2990 };
  const loaded = { storageKey: "actor-a:test", pending, ready: true };
  assert.deepEqual(policy.scopedPriceRequestState("actor-a:test", loaded), {
    pending,
    ready: true,
  });
  for (const key of [null, "actor-b:test", "actor-a:live"])
    assert.deepEqual(policy.scopedPriceRequestState(key, loaded), { pending: null, ready: false });
  assert.deepEqual(policy.scopedPriceRequestState("actor-a:test", null), {
    pending: null,
    ready: false,
  });
  assert.deepEqual(
    policy.scopedPriceRequestState("actor-a:test", { ...loaded, ready: false, pending: null }),
    { pending: null, ready: false },
  );
});

test("real create form is mobile-first, disabled when pending, and never promises publication or repricing", () => {
  const html = render(PriceCreateCard, { disabled: true, onCreate: neverMutateOnRender });
  assert.match(html, /Criar versão sem publicar/);
  assert.match(html, /não publica a oferta, não cobra/);
  assert.match(html, /contratos ou reservas existentes/);
  assert.match(html, /inputmode="decimal"/i);
  assert.match(html, /aria-describedby=/);
  assert.match(html, /min-h-5/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /name="(?:account|mode|price_id|product|secret)/);
});

test("real link and publish dialogs capture revision and cannot mutate on render", () => {
  const common = { busy: false, onClose: neverMutateOnRender, onConfirm: neverMutateOnRender };
  const link = render(PriceConfirmDialog, {
    ...common,
    state: { kind: "link", version, revision: 7 },
  });
  assert.match(link, /Vincular e manter pausada/);
  assert.match(link, /revisão 7/);
  assert.match(link, /Publicar será uma ação separada/);
  assert.match(link, /role="dialog"/);
  assert.doesNotMatch(link, /local-version-reference|<input/);
  const publish = render(PriceConfirmDialog, {
    ...common,
    state: { kind: "publish", amountCents: 2990, revision: 8 },
  });
  assert.match(publish, /PUBLICAR/);
  assert.match(publish, /name="confirmation"/);
  assert.match(publish, /Nenhuma cobrança é feita/);
  assert.match(publish, /reservas existentes mantêm o preço já fixado/);
});

test("real history supports local recovery, paused linking and pagination without exposing external references", () => {
  const html = render(PriceHistory, {
    versions: [version, { ...version, id: "local-current", is_current: true }],
    operations: [
      operation,
      {
        ...operation,
        id: "local-review",
        status: "manual_review",
        can_resume: false,
        account_id: "acct_hidden",
        price_id: "price_hidden",
        request_key: "hidden-key",
      },
    ],
    busy: false,
    onLink: neverMutateOnRender,
    onResume: neverMutateOnRender,
    versionsMore: { busy: false, onClick: neverMutateOnRender },
  });
  assert.match(html, /Vincular e pausar/);
  assert.match(html, /Versão vinculada/);
  assert.match(html, /Recuperar esta operação/);
  assert.match(html, /Não crie outra solicitação/);
  assert.match(html, /Carregar mais/);
  for (const privateValue of [
    "acct_hidden",
    "price_hidden",
    "hidden-key",
    version.id,
    operation.id,
  ])
    assert.equal(html.includes(privateValue), false);
});
