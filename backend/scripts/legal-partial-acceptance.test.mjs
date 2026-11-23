import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const compile = (path, dependencies) => {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "exports", source)((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  }, exports);
  return exports;
};
const contracts = compile("../src/modules/legal/contracts.ts", {
  "node:crypto": require("node:crypto"),
});
const documents = [
  { id: "t1", kind: "terms", content_hash: "th" },
  { id: "p2", kind: "privacy", content_hash: "ph" },
];
const { acceptLegalInTransaction } = compile(
  "../src/modules/legal/repositories/LegalWriteRepository.ts",
  {
    "@/infra/database/prisma": { default: {} },
    "../contracts": contracts,
    "./LegalReadRepository": { currentDocuments: async () => documents },
  },
);
function transaction(accepted) {
  const writes = [];
  return {
    writes,
    $executeRaw: async () => {},
    legal_acceptance: {
      findMany: async (query) => {
        assert.equal(query.where.user_id, "u");
        return accepted.map((document_id) => ({ document_id }));
      },
      createMany: async (data) => writes.push(data),
    },
  };
}
const input = {
  document_ids: ["p2"],
  terms_accepted: false,
  privacy_acknowledged: true,
  adult_confirmed: true,
};
test("privacy update records only privacy when current terms were already accepted", async () => {
  const tx = transaction(["t1"]);
  await acceptLegalInTransaction(tx, "u", input);
  assert.deepEqual(
    tx.writes[0].data.map((row) => [row.document_id, row.action]),
    [["p2", "privacy_acknowledge"]],
  );
});
test("terms update requires only terms confirmation with previously accepted privacy", async () => {
  const tx = transaction(["p2"]);
  await acceptLegalInTransaction(tx, "u", {
    ...input,
    document_ids: ["t1"],
    terms_accepted: true,
    privacy_acknowledged: false,
  });
  assert.equal(tx.writes[0].data[0].action, "terms_accept");
});
test("rejects omitted unaccepted documents, old versions, duplicates and empty requests", async () => {
  for (const [accepted, ids] of [
    [[], ["p2"]],
    [["t0"], ["p2"]],
    [["t1"], ["p1"]],
    [["t1"], ["p2", "p2"]],
    [["t1"], []],
  ]) {
    const tx = transaction(accepted);
    await assert.rejects(acceptLegalInTransaction(tx, "u", { ...input, document_ids: ids }), {
      code: "legal_documents_changed",
    });
    assert.equal(tx.writes.length, 0);
  }
});
test("rejects unchecked selected document and missing adult declaration", async () => {
  for (const patch of [{ privacy_acknowledged: false }, { adult_confirmed: false }]) {
    const tx = transaction(["t1"]);
    await assert.rejects(acceptLegalInTransaction(tx, "u", { ...input, ...patch }));
    assert.equal(tx.writes.length, 0);
  }
});
test("old clients sending both documents remain compatible", async () => {
  const tx = transaction([]);
  await acceptLegalInTransaction(tx, "u", {
    ...input,
    document_ids: ["t1", "p2"],
    terms_accepted: true,
  });
  assert.equal(tx.writes[0].data.length, 2);
  assert.equal(tx.writes[0].skipDuplicates, true);
});
