import "./register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Bridge Node ESM to the installed Next CJS exports, without replacing either component.
const bridges = new Map(
  ["link", "image"].map((name) => {
    const url = import.meta.resolve(`next/${name}.js`);
    return [
      `next/${name}`,
      `data:text/javascript,${encodeURIComponent(`import actual from ${JSON.stringify(url)}; export default actual.default ?? actual;`)}`,
    ];
  }),
);
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(bridges.get(specifier) ?? specifier, context);
  },
});

const { fullPublishedDocSchema, legalStatusSchema, legalDocumentIdSchema } = await import(
  "../src/api/req/legal/types.ts"
);
const {
  hasCompleteLegalSet,
  legalDocumentHref,
  legalSetKey,
  pendingLegalSet,
  selectLegalDocument,
  canPromptLegalOnPath,
} = await import("../src/components/legal/policy.ts");
const { parseLegalText, LegalDocumentBody } = await import(
  "../src/components/legal/document-body.tsx"
);
const { legalAcceptanceSchema, adultConfirmedSchema, toLegalAcceptancePayload } = await import(
  "../src/components/legal/use-form.tsx"
);
const { adultDeclarationSchema, AdultDeclarationModal } = await import(
  "../src/components/legal/adult-declaration-modal.tsx"
);
const { LegalAcceptanceModal } = await import("../src/components/legal/acceptance-modal.tsx");
const { createLegalDismissalStore } = await import("../src/components/legal/dismissal.ts");
const { LegalTemplate } = await import("../src/templates/legal/index.tsx");
const { registerPatientSchema, LEGACY_TERMS_VERSION: patientLegacy } = await import(
  "../src/app/auth/register/patient/use-form.tsx"
);
const { registerPsychologistSchema, LEGACY_TERMS_VERSION: psychologistLegacy } = await import(
  "../src/app/auth/register/psychologist/use-form.tsx"
);
const { default: keys } = await import("../src/api/cache/keys.ts");

// Literal inputs exercise real parsers/renderers only. No mocked HTTP, session, provider or DB.
// These are NOT approved legal copy or evidence of publication/integration.
const documents = ["terms", "privacy"].map((kind, index) => ({
  id: `parser-input-${kind}`,
  kind,
  version: index + 1,
  title: `Entrada de teste ${kind}`,
  body: "# Entrada de parser\n\nTexto literal para teste unitário.",
  change_summary: "Entrada de teste do resumo.",
  content_hash: `hash-input-${kind}`,
  published_at: "2026-09-12T12:00:00.000Z",
}));
const current = { configured: true, documents };
const confirmations = { terms_accepted: true, privacy_acknowledged: true, adult_confirmed: true };
const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const ast = (path) =>
  ts.createSourceFile(path, source(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nodes = (root, predicate) => {
  const matches = [];
  const visit = (node) => {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return matches;
};

for (const [label, schema, name] of [
  ["paciente", registerPatientSchema, { name: "Entrada de teste" }],
  [
    "psicólogo",
    registerPsychologistSchema,
    { professional_first_name: "Entrada", professional_last_name: "Teste" },
  ],
]) {
  test(`schema real de cadastro ${label} exige maioridade explícita, sem aceite jurídico presumido`, () => {
    const input = {
      ...name,
      email: "unit@example.test",
      password: "Unit-test-password",
      password_confirm: "Unit-test-password",
    };
    for (const value of [undefined, false, "true", 1]) {
      assert.equal(schema.safeParse({ ...input, adult_confirmed: value }).success, false);
    }
    const parsed = schema.parse({ ...input, adult_confirmed: true });
    assert.equal(parsed.adult_confirmed, true);
    assert.equal("terms_accepted" in parsed, false);
  });
}

test("maioridade no Google e aceite formal nunca aceitam false, string, ausência", () => {
  for (const value of [false, undefined, "true", 1, null]) {
    assert.equal(adultConfirmedSchema.safeParse(value).success, false);
    assert.equal(adultDeclarationSchema.safeParse({ adult_confirmed: value }).success, false);
    assert.equal(
      legalAcceptanceSchema.safeParse({ ...confirmations, adult_confirmed: value }).success,
      false,
    );
  }
  assert.equal(adultDeclarationSchema.safeParse({ adult_confirmed: true }).success, true);
});

test("cada declaração jurídica exige true independente", () => {
  for (const field of Object.keys(confirmations)) {
    const result = legalAcceptanceSchema.safeParse({ ...confirmations, [field]: false });
    assert.equal(result.success, false);
    assert.deepEqual(result.error.issues[0].path, [field]);
  }
});

test("payload real envia conjunto completo, nunca somente pendentes ou versão legada", () => {
  assert.deepEqual(toLegalAcceptancePayload(confirmations, documents), {
    document_ids: documents.map((document) => document.id),
    ...confirmations,
  });
  assert.throws(() =>
    toLegalAcceptancePayload({ ...confirmations, adult_confirmed: false }, documents),
  );
  assert.throws(() => toLegalAcceptancePayload(confirmations, documents.slice(0, 1)));
  assert.match(patientLegacy, /pending-legal-copy/);
  assert.match(psychologistLegacy, /pending-legal-copy/);
});

test("validação real recusa corpo vazio, kind inválido e publicação ausente", () => {
  assert.equal(fullPublishedDocSchema.safeParse(documents[0]).success, true);
  for (const patch of [{ body: " " }, { published_at: null }, { kind: "draft" }, { version: 0 }]) {
    assert.equal(fullPublishedDocSchema.safeParse({ ...documents[0], ...patch }).success, false);
  }
  for (const id of ["", "../src/components", "../current", "a/b", "a?version=other", "#draft"]) {
    assert.equal(legalDocumentIdSchema.safeParse(id).success, false);
  }
});

test("modal só tem conjunto pendente quando ambos publicados e configured", () => {
  const status = { ...current, pending_document_ids: [documents[0].id], acceptances: [] };
  assert.equal(legalStatusSchema.safeParse(status).success, true);
  assert.deepEqual(pendingLegalSet(status)?.documents, documents);
  for (const input of [
    null,
    { ...status, configured: false },
    { ...status, documents: [] },
    { ...status, documents: [documents[0], documents[0]] },
    { ...status, pending_document_ids: [] },
    { ...status, pending_document_ids: ["unknown-id"] },
  ]) {
    assert.equal(pendingLegalSet(input), null);
  }
  assert.equal(hasCompleteLegalSet(current), true);
});

test("links e seleção de versão exata nunca trocam silenciosamente o documento", () => {
  assert.equal(legalDocumentHref(documents[0]), "/termos-de-servico?version=parser-input-terms");
  assert.equal(selectLegalDocument("terms", current, undefined, null), documents[0]);
  assert.equal(selectLegalDocument("terms", current, "missing", null), null);
  assert.equal(selectLegalDocument("terms", current, "", null), null);
  assert.equal(selectLegalDocument("privacy", current, documents[0].id, documents[0]), null);
  assert.equal(selectLegalDocument("terms", current, "another-id", documents[0]), null);
  const previous = { ...documents[0], id: "previous-terms-id" };
  assert.equal(selectLegalDocument("terms", current, previous.id, previous), previous);
  assert.equal(
    selectLegalDocument("terms", { configured: false, documents: [] }, undefined, null),
    null,
  );
});

test("Agora não é memória isolada por aba, conta e conjunto, independente da ordem", () => {
  const store = createLegalDismissalStore();
  const key = legalSetKey(documents);
  assert.equal(key, legalSetKey([...documents].reverse()));
  let updates = 0;
  const unsubscribe = store.subscribe(() => {
    updates += 1;
  });
  store.dismiss("unit-account", key);
  assert.equal(updates, 1);
  assert.equal(store.read("unit-account"), key);
  assert.equal(store.read("other-account"), null);
  assert.equal(createLegalDismissalStore().read("unit-account"), null);
  assert.notEqual(key, legalSetKey([{ ...documents[0], id: "next-terms-id" }, documents[1]]));
  unsubscribe();
  store.dismiss("unit-account", "next-set");
  assert.equal(updates, 1);
});

test("leitura pública, reset e direitos da conta não recebem modal", () => {
  for (const path of [
    "/auth/login",
    "/auth/recovery",
    "/auth/reset-password/code",
    "/app/account/need-reset",
    "/app/configuracoes/conta",
    "/app/settings/account",
    "/app/conta",
    "/termos-de-servico",
    "/politica-de-privacidade",
  ]) {
    assert.equal(canPromptLegalOnPath(path), false, path);
  }
  assert.equal(canPromptLegalOnPath("/psicologos"), true);
});

test("parser preserva texto e só interpreta headings Markdown limitados", () => {
  assert.deepEqual(parseLegalText("# Título\r\n\r\nLinha 1\r\nLinha 2\n###### Subtítulo"), [
    { key: 0, text: "Título", heading: 2 },
    { key: 2, text: "Linha 1\nLinha 2", heading: null },
    { key: 4, text: "Subtítulo", heading: 6 },
  ]);
});

test("render React real escapa HTML e não transforma links/Markdown em conteúdo ativo", () => {
  const html = renderToStaticMarkup(
    createElement(LegalDocumentBody, {
      body: "# <script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n[link](javascript:alert(1))\n**literal**",
    }),
  );
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img/);
  assert.match(html, /\[link\]\(javascript:/);
  assert.match(html, /\*\*literal\*\*/);
  assert.doesNotMatch(html, /<script|<img|<a\b|<strong/);
});

test("template real indisponível não publica minuta nem forja revisão", () => {
  const html = renderToStaticMarkup(
    createElement(LegalTemplate, { document: null, kind: "terms", versionRequested: false }),
  );
  assert.match(html, /Documento indisponível/);
  assert.doesNotMatch(html, /<time|Versão \d|Entrada de teste|pending-legal-copy/);
});

test("modal real: duas declarações legais mais checkbox 18+, todos desmarcados e com erro reservado", () => {
  const html = renderToStaticMarkup(
    createElement(LegalAcceptanceModal, {
      documents,
      onClose() {},
      async onSubmit() {},
      disabled: true,
    }),
  );
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /\schecked(?:=|\s|>)/);
  assert.equal((html.match(/min-h-4/g) ?? []).length, 3);
  assert.match(html, /18 anos ou mais/);
  assert.match(html, /ciência|ciente/);
  assert.match(html, /version=parser-input-terms/);
  assert.match(html, /version=parser-input-privacy/);
  const close = html.match(/<button[^>]*>Agora não<\/button>/)?.[0];
  assert.ok(close);
  assert.doesNotMatch(close, /\sdisabled(?:=|\s|>)/);
  assert.match(html, /type="submit"/);
  assert.doesNotMatch(html, /marketing|LGPD/);
});

test("modal Google real mostra uma autodeclaração vazia e IDs RHF únicos", () => {
  const modal = () => createElement(AdultDeclarationModal, { onClose() {}, async onSubmit() {} });
  const html = renderToStaticMarkup(createElement(Fragment, null, modal(), modal()));
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /\schecked(?:=|\s|>)/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.match(html, /Contas Lectum são exclusivas/);
});

for (const role of ["patient", "psychologist"]) {
  test(`AST cadastro ${role}: payload manual/Google com adulto, revisão antes do OAuth, sem autoaceite vigente`, () => {
    const tree = ast(`../src/app/auth/register/${role}/logic.tsx`);
    const declarations = nodes(tree, ts.isVariableDeclaration);
    const google = declarations.find((node) => node.name.getText(tree) === "handleGoogleRegister");
    assert.ok(google);
    const body = google.initializer.getText(tree);
    assert.ok(body.indexOf("adultConfirmedSchema.safeParse") < body.indexOf("fingerprint()"));
    assert.match(body, /adult_confirmed: String\(values.adult_confirmed\)/);
    assert.doesNotMatch(body, /setValue|current\.documents|document_ids/);
    const manual = declarations
      .find((node) => node.name.getText(tree) === "handleSubmit")
      .initializer.getText(tree);
    assert.match(manual, /adult_confirmed: data.adult_confirmed/);
    const all = tree.getFullText();
    assert.match(all, /onClick=\{\(\) => setAdultReviewOpen\(true\)\}/);
    assert.doesNotMatch(all, /Ao continuar, você aceita/);
  });
}

test("AST: POST somente no submit explícito; fechar só memoriza, sem POST/effect/storage", () => {
  const tree = ast("../src/components/legal/acceptance-request.tsx");
  const attrs = nodes(tree, ts.isJsxAttribute);
  const close = attrs.find((node) => node.name.getText(tree) === "onClose").getText(tree);
  assert.match(close, /legalDismissalStore.dismiss/);
  assert.doesNotMatch(close, /mutate|acceptLegal/);
  const submit = attrs.find((node) => node.name.getText(tree) === "onSubmit").getText(tree);
  assert.match(submit, /mutateAsync\(toLegalAcceptancePayload/);
  assert.match(submit, /=== 409/);
  assert.match(submit, /epoch:/);
  assert.doesNotMatch(tree.getFullText(), /useEffect|localStorage|sessionStorage/);
  assert.doesNotMatch(
    source("../src/components/legal/dismissal.ts"),
    /localStorage|sessionStorage|fetch\(|mutate/,
  );
});

test("contratos SSR/rollout/cache: públicos no-store, privado por usuário, polling moderado sem retries POST", () => {
  assert.notDeepEqual(keys.legal.status("a"), keys.legal.status("b"));
  const server = source("../src/api/req/legal/server.ts");
  assert.match(server, /import "server-only"/);
  assert.match(server, /getPublicApiSource/);
  assert.match(server, /cache: "no-store"/);
  assert.doesNotMatch(server, /cookies\(|Authorization|console\./);
  const request = source("../src/api/req/legal/index.ts");
  assert.match(request, /getApiErrorStatus\(error\) === 404\) return null/);
  const caller = source("../src/api/callers/legal/index.tsx");
  assert.match(caller, /LEGAL_POLL_INTERVAL = 5 \* 60 \* 1_000/);
  assert.match(caller, /refetchOnWindowFocus: "always"/);
  assert.match(caller, /mutationFn: api.acceptLegal,\s+retry: false/);
  const seo = source("../src/templates/legal/logic.ts");
  assert.match(seo, /configured && document && !versionRequested/);
  for (const route of ["termos-de-servico", "politica-de-privacidade"]) {
    assert.match(source(`../src/app/${route}/page.tsx`), /dynamic = "force-dynamic"/);
  }
});
