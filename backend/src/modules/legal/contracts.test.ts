import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import type { legal_document_version } from "@/external/generated/prisma/client";
import {
  canPublishDocument,
  documentHash,
  documentSummary,
  hasLegalPlaceholders,
  isCompleteLegalBundle,
  isCurrentDocumentSet,
  LEGAL_KINDS,
  LegalError,
  normalizeDraft,
  publicDocument,
} from "./contracts";

// Pure value contracts; no database/client/environment/provider import or replacement.
const draft = {
  title: "Documento de teste",
  body: "Texto exclusivo para teste de contrato. ".repeat(40),
  change_summary: "Descrição da alteração de teste.",
};
const documents = [
  { id: "terms-current", kind: "terms" },
  { id: "privacy-current", kind: "privacy" },
];
const document: legal_document_version = {
  ...draft,
  id: "document-contract-only",
  kind: "terms",
  version: 3,
  status: "published",
  revision: 5,
  content_hash: documentHash(draft),
  created_by_admin_id: "author-contract-only",
  updated_by_admin_id: "editor-contract-only",
  published_by_admin_id: "publisher-contract-only",
  published_at: new Date("2026-09-12T12:00:00.000Z"),
  createdAt: new Date("2026-09-10T12:00:00.000Z"),
  updatedAt: new Date("2026-09-12T12:00:00.000Z"),
};

test("legal normalization trims edges, canonicalizes CRLF/CR and preserves internal text", () => {
  const input = { title: "  Título  ", body: " \r\nA\r\nB\rC  D\n ", change_summary: " Resumo " };
  const before = { ...input };
  assert.deepEqual(normalizeDraft(input), {
    title: "Título",
    body: "A\nB\nC  D",
    change_summary: "Resumo",
  });
  assert.deepEqual(input, before);
});

test("legal hash is SHA-256 of the ordered normalized JSON, not body alone", () => {
  const normalized = normalizeDraft(draft);
  assert.equal(
    documentHash(draft),
    createHash("sha256").update(JSON.stringify(normalized)).digest("hex"),
  );
  assert.notEqual(documentHash(draft), createHash("sha256").update(draft.body).digest("hex"));
  assert.match(documentHash(draft), /^[a-f0-9]{64}$/u);
});

test("legal hash ignores only canonical edge/newline differences and property input order", () => {
  const a = { title: " Título ", body: " A\r\nB\rC ", change_summary: " Resumo " };
  const b = { change_summary: "Resumo", body: "A\nB\nC", title: "Título" };
  assert.equal(documentHash(a), documentHash(b));
});

for (const field of ["title", "body", "change_summary"] as const) {
  test(`legal hash binds ${field} and preserves meaningful changes`, () => {
    assert.notEqual(
      documentHash(draft),
      documentHash({ ...draft, [field]: `${draft[field]} alteração` }),
    );
  });
}

test("legal configured bundle requires both kinds, not merely two rows", () => {
  assert.deepEqual(LEGAL_KINDS, ["terms", "privacy"]);
  assert.equal(isCompleteLegalBundle([]), false);
  assert.equal(isCompleteLegalBundle(documents.slice(0, 1)), false);
  assert.equal(isCompleteLegalBundle([{ kind: "privacy" }, { kind: "privacy" }]), false);
  assert.equal(isCompleteLegalBundle(documents), true);
});

test("legal acceptance document set requires exact current IDs, unique and order-independent", () => {
  assert.equal(isCurrentDocumentSet(["privacy-current", "terms-current"], documents), true);
  for (const ids of [
    [],
    ["terms-current"],
    ["terms-current", "terms-current"],
    ["terms-old", "privacy-current"],
    ["terms-current", "privacy-current", "extra"],
  ]) {
    assert.equal(isCurrentDocumentSet(ids, documents), false);
  }
  assert.equal(isCurrentDocumentSet(["terms-current"], documents.slice(0, 1)), false);
  assert.equal(isCurrentDocumentSet([], []), false);
});

test("legal placeholder detection covers approved uppercase bracket notation", () => {
  for (const placeholder of [
    "[CNPJ]",
    "[ENDERECO_EMPRESARIAL]",
    "[RAZÃO SOCIAL]",
    "[DPO/CONTATO]",
    "[PRAZO (DIAS)]",
  ]) {
    assert.equal(hasLegalPlaceholders(`Texto ${placeholder}.`), true);
  }
  assert.equal(hasLegalPlaceholders("Texto definitivo sem campos pendentes."), false);
});

for (const field of ["title", "body", "change_summary"] as const) {
  test(`legal publication rejects unresolved placeholder in ${field}`, () => {
    assert.equal(canPublishDocument({ ...draft, [field]: `${draft[field]} [CNPJ]` }), false);
  });
}

test("legal publication rejects Minuta/Rascunho headings anywhere, case-insensitively", () => {
  for (const heading of ["Minuta", "rascunho", "# MINUTA", "###### Rascunho"]) {
    assert.equal(
      canPublishDocument({ ...draft, body: `${draft.body}\n${heading}\nTexto.` }),
      false,
    );
  }
});

test("legal publication enforces normalized title/body/summary minimum lengths inclusively", () => {
  const minimum = { title: "T".repeat(5), body: "B".repeat(1000), change_summary: "S".repeat(10) };
  assert.equal(canPublishDocument(minimum), true);
  for (const field of ["title", "body", "change_summary"] as const) {
    assert.equal(
      canPublishDocument({ ...minimum, [field]: ` ${minimum[field].slice(1)} ` }),
      false,
    );
  }
  assert.equal(canPublishDocument(draft), true);
});

test("legal public projection excludes draft control and Admin identity metadata", () => {
  const value = publicDocument(document);
  assert.deepEqual(Object.keys(value).sort(), [
    "body",
    "change_summary",
    "content_hash",
    "id",
    "kind",
    "published_at",
    "title",
    "version",
  ]);
  assert.equal(value.published_at, "2026-09-12T12:00:00.000Z");
  assert.equal(value.content_hash, documentHash(draft));
});

test("legal Admin list summary omits body on the wire and keeps revision/count", () => {
  const value = documentSummary(document, 7);
  assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(value)), "body"), false);
  assert.equal(value.acceptance_count, 7);
  assert.equal(documentSummary(document).acceptance_count, 0);
  assert.equal(value.revision, 5);
  assert.equal(value.created_at, document.createdAt.toISOString());
  assert.equal(value.updated_at, document.updatedAt.toISOString());
  assert.equal(
    documentSummary({ ...document, status: "draft", published_at: null }).published_at,
    null,
  );
});

test("legal errors preserve explicit safe domain status and code", () => {
  const conflict = new LegalError("legal_conflict");
  assert.ok(conflict instanceof Error);
  assert.equal(conflict.name, "LegalError");
  assert.equal(conflict.status, 409);
  assert.equal(conflict.message, "legal_conflict");
  assert.equal(new LegalError("legal_not_found", 404).status, 404);
  assert.equal(new LegalError("adult_declaration_required", 422).status, 422);
});
