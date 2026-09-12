import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import {
  getLegalPublishBlock,
  isLegalRevisionConflict,
  legalDate,
  legalDraftSchema,
  legalReviewSchema,
} from "../src/app/(admin)/configuracoes/documentos-legais/modules/legal-policy.ts";

// Unit and source-contract tests only. No request, database, auth or provider is mocked.
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const validInput = {
  title: "Termos de Uso",
  body: "a".repeat(1000),
  change_summary: "Revisão inicial",
};

test("rascunho aceita conteúdo incompleto sem permitir campos vazios ou excesso", () => {
  assert.equal(legalDraftSchema.safeParse({ ...validInput, body: "a" }).success, true);
  for (const body of ["", "  ", "a".repeat(100001)]) {
    assert.equal(legalDraftSchema.safeParse({ ...validInput, body }).success, false);
  }
  for (const title of ["a".repeat(4), "a".repeat(181)]) {
    assert.equal(legalDraftSchema.safeParse({ ...validInput, title }).success, false);
  }
  for (const change_summary of ["a".repeat(9), "a".repeat(2001)]) {
    assert.equal(legalDraftSchema.safeParse({ ...validInput, change_summary }).success, false);
  }
  assert.equal(
    legalDraftSchema.safeParse({
      title: "a".repeat(180),
      body: "a".repeat(100000),
      change_summary: "a".repeat(2000),
    }).success,
    true,
  );
});

test("guarda real de publicação bloqueia publicado, curto, inválido e marcadores", () => {
  assert.equal(getLegalPublishBlock({ ...validInput, status: "draft" }), null);
  assert.ok(getLegalPublishBlock({ ...validInput, status: "published" }));
  assert.ok(getLegalPublishBlock({ ...validInput, status: "draft", body: "a".repeat(999) }));
  assert.ok(getLegalPublishBlock({ ...validInput, status: "draft", title: "a" }));
  for (const marker of [
    "[NOME DA EMPRESA]",
    "[CNPJ]",
    "[ENDERECO_EMPRESARIAL]",
    "[RAZÃO SOCIAL]",
    "[DPO/CONTATO]",
    "[PRAZO (DIAS)]",
    "[A_2-3]",
  ]) {
    for (const field of ["title", "body", "change_summary"]) {
      assert.ok(
        getLegalPublishBlock({
          ...validInput,
          status: "draft",
          [field]: `${validInput[field]} ${marker}`,
        }),
      );
    }
  }
});

test("guarda preserva colchetes e links Markdown fora da notação uppercase do backend", () => {
  for (const text of [
    "[]",
    "[A]",
    "[cnpj]",
    "[revisar\nendereço]",
    "[Política de Privacidade](https://example.com/privacidade)",
    "[termos][referencia]",
    "[NOME.EMPRESA]",
    `[${"A".repeat(102)}]`,
  ]) {
    for (const field of ["title", "body", "change_summary"]) {
      assert.equal(
        getLegalPublishBlock({
          ...validInput,
          status: "draft",
          [field]: `${validInput[field]} ${text}`,
        }),
        null,
        `${field}: ${text}`,
      );
    }
  }
  // Uppercase Markdown labels still match the exact backend placeholder notation.
  assert.ok(
    getLegalPublishBlock({
      ...validInput,
      status: "draft",
      body: `${validInput.body}\n[LGPD](https://example.com)`,
    }),
  );
});

test("guarda bloqueia linhas Minuta/Rascunho e headings Markdown como canPublishDocument", () => {
  for (const heading of [
    "Minuta",
    "rascunho",
    "# MINUTA",
    "###### Rascunho",
    "  ##\tMiNuTa de trabalho",
    "RASCUNHO: revisão",
    "#Minuta",
  ]) {
    for (const separator of ["\n", "\r\n", "\r"]) {
      assert.match(
        getLegalPublishBlock({
          ...validInput,
          status: "draft",
          body: `${validInput.body}${separator}${heading}${separator}Texto.`,
        }),
        /linhas iniciadas por Minuta ou Rascunho/,
      );
    }
  }
  for (const text of [
    "O rascunho anterior foi revisado.",
    "Minutar não é o mesmo marcador.",
    "####### Minuta",
  ]) {
    assert.equal(
      getLegalPublishBlock({ ...validInput, status: "draft", body: `${validInput.body}\n${text}` }),
      null,
    );
  }
  for (const field of ["title", "change_summary"]) {
    assert.equal(
      getLegalPublishBlock({
        ...validInput,
        status: "draft",
        [field]: "Minuta de trabalho revisada",
      }),
      null,
    );
  }
});

test("mínimo de publicação considera quebras CRLF normalizadas como no backend", () => {
  assert.ok(getLegalPublishBlock({ ...validInput, status: "draft", body: "a\r\n".repeat(500) }));
  assert.equal(
    getLegalPublishBlock({ ...validInput, status: "draft", body: "a\r\n".repeat(501) }),
    null,
  );
});

test("confirmação jurídica não aceita vazio, valor distinto ou repetido", () => {
  for (const confirmations of [[], ["yes"], ["reviewed", "reviewed"]]) {
    assert.equal(legalReviewSchema.safeParse({ confirmations }).success, false);
  }
  assert.equal(legalReviewSchema.safeParse({ confirmations: ["reviewed"] }).success, true);
  assert.match(
    read("../src/app/(admin)/configuracoes/documentos-legais/use-form.ts"),
    /defaultValues: \{ confirmations: \[\] \}/,
  );
});

test("conflito usa somente status, nunca mensagem técnica; datas inválidas são seguras", () => {
  assert.equal(isLegalRevisionConflict({ response: { status: 409 } }), true);
  for (const error of [
    null,
    undefined,
    "409",
    {},
    { response: { status: 500 } },
    { response: null },
  ]) {
    assert.equal(isLegalRevisionConflict(error), false);
  }
  assert.equal(legalDate("invalid"), "Data indisponível");
  assert.equal(legalDate(null), "Ainda não publicado");
});

test("leitor React real escapa HTML, scripts e links em Markdown", () => {
  const source = read(
    "../src/app/(admin)/configuracoes/documentos-legais/components/document-reader.tsx",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  new Function("require", "exports", compiled)(createRequire(import.meta.url), exports);
  const body =
    "<script>alert(1)</script><img src=x onerror=alert(2)>\n[abrir](javascript:alert(3))";
  const html = renderToStaticMarkup(
    createElement(exports.LegalDocumentReader, { body, title: "Leitura" }),
  );
  assert.doesNotMatch(html, /<script|<img|<a\s|dangerouslySetInnerHTML/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img/);
  assert.match(html, /\[abrir\]\(javascript:alert\(3\)\)/);
});

test("transportes reais têm contrato CAS, encoding e não oferecem delete", () => {
  const req = read("../src/api/req/legal/index.ts");
  assert.match(req, /\/api\/admin\/private\/settings\/legal/);
  assert.match(req, /encodeURIComponent\(id\)/);
  assert.match(req, /params: \{ page \}/);
  assert.match(req, /adminApi\.put<ApiResponse<AdminLegalDocument>>\(documentUrl\(id\), input\)/);
  assert.match(req, /documentUrl\(id\)\}\/duplicate/);
  assert.match(req, /documentUrl\(id\)\}\/publish/);
  assert.match(req, /documentUrl\(id\)\}\/acceptances/);
  assert.doesNotMatch(req, /adminApi\.delete/);
});

test("índice GET e abertura da minuta não criam registro automaticamente", () => {
  const list = read("../src/app/(admin)/configuracoes/documentos-legais/client.tsx");
  const create = read("../src/app/(admin)/configuracoes/documentos-legais/novo/client.tsx");
  assert.doesNotMatch(list, /mutate|useAdminLegalCreate|useEffect/);
  assert.match(create, /useLegalDraftForm\(LEGAL_DRAFT_TEMPLATES\[kind\]\)/);
  assert.match(create, /onSubmit=\{save\}/);
  assert.match(create, /mutation\.mutateAsync\(\{ \.\.\.values, kind \}\)/);
  assert.doesNotMatch(create, /useEffect|useAdminLegalPublish/);
});

test("edição preserva base CAS e conteúdo em conflito, e publicação exige confirmação", () => {
  const controller = read(
    "../src/app/(admin)/configuracoes/documentos-legais/hooks/use-document-editor.ts",
  );
  assert.match(controller, /useState\(latest\)/);
  assert.doesNotMatch(controller, /useEffect/);
  assert.match(controller, /latest\.revision !== document\.revision/);
  assert.match(controller, /conflict \|\| document\.status !== "draft"/);
  assert.match(controller, /revision: document\.revision/g);
  assert.match(controller, /publishBlock \|\| !legalReviewSchema\.safeParse\(values\)\.success/);
  assert.match(controller, /review_confirmed: true/);
  const conflictHandler = controller.slice(
    controller.indexOf("const failure"),
    controller.indexOf("const save"),
  );
  assert.doesNotMatch(conflictHandler, /form\.reset|setDocument/);
  assert.match(
    read("../src/app/(admin)/configuracoes/documentos-legais/components/publish-dialog.tsx"),
    /useAdminDialogLifecycle/,
  );
  assert.match(
    read("../src/app/(admin)/configuracoes/documentos-legais/components/publish-dialog.tsx"),
    /!confirmed \|\| Boolean\(blocked\)/,
  );
});

test("cache fica restrito a legal, sem retry de mutação nem retenção de aceites", () => {
  const callers = read("../src/api/callers/legal/index.ts");
  assert.match(callers, /invalidateQueries\(\{ queryKey: adminLegalKeys\.all \}\)/);
  assert.match(callers, /adminLegalKeys\.acceptances\(id, page\)/);
  assert.match(callers, /gcTime: 0/);
  assert.equal((callers.match(/retry: false/g) ?? []).length, 4);
  assert.doesNotMatch(callers, /adminSettingsKeys|queryClient\.clear|removeQueries/);
});
