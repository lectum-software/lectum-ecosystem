import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildSourceGraph,
  findCycles,
  moduleSpecifiersFrom,
  resolveSourceImport,
  walk,
} from "./check-import-cycles.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ts = createRequire(path.join(repositoryRoot, "backend/package.json"))("typescript");
const sourceRoot = path.join(repositoryRoot, "video/src");
const workerPath = path.join(sourceRoot, "worker.ts");
const videoFiles = new Set(await walk(sourceRoot));
const parse = (file, source) =>
  ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
const worker = parse(workerPath, await readFile(workerPath, "utf8"));
const config = JSON.parse(await readFile(path.join(repositoryRoot, "video/tsconfig.json"), "utf8"));
const { options, errors } = ts.convertCompilerOptionsFromJson(
  config.compilerOptions,
  path.join(repositoryRoot, "video"),
);
assert.deepEqual(errors, []);
const resolve = (specifier, sourceFiles = videoFiles, importer = workerPath) =>
  resolveSourceImport({ importer, sourceRoot, sourceFiles, specifier });

// The real application sources are READ and parsed, never imported/executed.
// Contracts below use pure in-memory path sets and TypeScript ASTs, not fake
// providers, filesystem modules, network responses or permanent repo cycles.
const workerSpecifiers = moduleSpecifiersFrom(worker);
const localWorkerSpecifiers = workerSpecifiers.filter((specifier) => specifier.startsWith("."));

test("control: real worker AST includes mixed runtime/type imports, excludes third-party resolution", () => {
  assert.ok(workerSpecifiers.includes("dotenv/config"));
  assert.ok(workerSpecifiers.includes("bullmq"));
  assert.ok(localWorkerSpecifiers.includes("./domain/jobs/contracts.js"));
  assert.equal(resolve("dotenv/config"), null);
  assert.equal(resolve("bullmq"), null);
  assert.equal(resolve("node:url"), null);
});

for (const specifier of localWorkerSpecifiers) {
  test(`real worker: ${specifier} agrees with installed TypeScript source resolution`, () => {
    const expected = ts.resolveModuleName(specifier, workerPath, options, ts.sys).resolvedModule;
    assert.ok(expected);
    assert.equal(expected.isExternalLibraryImport, false);
    const expectedSource = path.normalize(expected.resolvedFileName);
    assert.ok(videoFiles.has(expectedSource));
    assert.equal(resolve(specifier), expectedSource);
  });
}

test("real queue/client AST excludes the type-only env edge but keeps mixed contracts/logging", async () => {
  const file = path.join(sourceRoot, "infra/queue/client.ts");
  const specifiers = moduleSpecifiersFrom(parse(file, await readFile(file, "utf8")));
  assert.ok(!specifiers.includes("../../config/env.js"));
  assert.ok(specifiers.includes("../../domain/jobs/contracts.js"));
  assert.ok(specifiers.includes("../../http/logging.js"));
  for (const specifier of specifiers.filter((value) => value.startsWith("."))) {
    assert.ok(resolve(specifier, videoFiles, file));
  }
});

test("real video graph includes all local worker edges without importing application code", async () => {
  const graph = await buildSourceGraph(sourceRoot);
  assert.equal(graph.size, videoFiles.size);
  assert.equal(graph.get(workerPath).size, localWorkerSpecifiers.length);
  assert.ok(graph.get(workerPath).has(path.join(sourceRoot, "config/env.ts")));
  assert.ok(graph.get(workerPath).has(path.join(sourceRoot, "infra/queue/client.ts")));
  assert.ok(
    !graph
      .get(path.join(sourceRoot, "infra/queue/client.ts"))
      .has(path.join(sourceRoot, "config/env.ts")),
  );
});

const localPath = (file) => path.join(sourceRoot, "cycle-contract", file);
const pathSet = (...files) => new Set(files.map(localPath));
const resolveContract = (specifier, files) =>
  resolveSourceImport({
    importer: localPath("entry.ts"),
    sourceRoot,
    sourceFiles: files,
    specifier,
  });

for (const [emitted, source] of [
  [".js", ".ts"],
  [".js", ".tsx"],
  [".jsx", ".tsx"],
  [".jsx", ".ts"],
  [".mjs", ".mts"],
  [".cjs", ".cts"],
]) {
  test(`extension substitution: ${emitted} resolves ${source} source`, () => {
    assert.equal(
      resolveContract(`./target${emitted}`, pathSet(`target${source}`)),
      localPath(`target${source}`),
    );
  });
}

for (const [emitted, preferred, alternative] of [
  [".js", ".ts", ".tsx"],
  [".jsx", ".tsx", ".ts"],
  [".mjs", ".mts", ".mjs"],
  [".cjs", ".cts", ".cjs"],
]) {
  test(`extension priority: ${emitted} prefers ${preferred} even when runtime file exists`, () => {
    assert.equal(
      resolveContract(
        `./target${emitted}`,
        pathSet(`target${emitted}`, `target${preferred}`, `target${alternative}`),
      ),
      localPath(`target${preferred}`),
    );
  });
}

for (const extension of [".js", ".jsx", ".mjs", ".cjs"]) {
  test(`control: real ${extension} implementation remains resolvable without TypeScript sibling`, () => {
    assert.equal(
      resolveContract(`./target${extension}`, pathSet(`target${extension}`)),
      localPath(`target${extension}`),
    );
  });
}

for (const declaration of [".d.ts", ".d.mts", ".d.cts"]) {
  test(`declaration ${declaration} is never a runtime graph edge`, () => {
    assert.equal(resolveContract(`./target${declaration}`, pathSet(`target${declaration}`)), null);
    const emitted = declaration === ".d.mts" ? ".mjs" : declaration === ".d.cts" ? ".cjs" : ".js";
    assert.equal(resolveContract(`./target${emitted}`, pathSet(`target${declaration}`)), null);
    assert.equal(
      resolveContract(`./target${emitted}`, pathSet(`target${declaration}`, `target${emitted}`)),
      localPath(`target${emitted}`),
    );
  });
}

test("control: extensionless file/index and @/ alias remain local to sourceFiles", () => {
  assert.equal(resolveContract("./target", pathSet("target.ts")), localPath("target.ts"));
  assert.equal(
    resolveContract("./target", pathSet("target/index.ts")),
    localPath("target/index.ts"),
  );
  assert.equal(
    resolveContract("@/cycle-contract/target", pathSet("target.ts")),
    localPath("target.ts"),
  );
  assert.equal(resolveContract("./absent.js", pathSet("target.ts")), null);
  assert.equal(resolveContract("react", pathSet("react.ts")), null);
  assert.equal(resolveContract("@vendor/package", pathSet("package.ts")), null);
  assert.equal(resolveContract("../../../outside.js", pathSet("outside.ts")), null);
});

test("AST policy: type-only import/export declarations and named bindings produce no runtime edges", () => {
  const ast = parse(
    localPath("entry.ts"),
    `
    import type DefaultType from "./default-type.js";
    import { type A, type B } from "./named-types.js";
    export type { A } from "./export-type.js";
    export { type A, type B } from "./export-named-types.js";
    export type * from "./type-star.js";
    import "./side-effect.js";
    import DefaultValue, { type A } from "./default-value.js";
    import { type A, value } from "./mixed.js";
    export { type A, value } from "./export-mixed.js";
    export * from "./export-star.js";
  `,
  );
  assert.deepEqual(moduleSpecifiersFrom(ast), [
    "./side-effect.js",
    "./default-value.js",
    "./mixed.js",
    "./export-mixed.js",
    "./export-star.js",
  ]);
});

test("cycle detector now sees emitted-extension cycles in pure local AST/path contracts", () => {
  const a = localPath("a.ts"),
    b = localPath("b.ts");
  const files = new Set([a, b]);
  const graph = new Map([
    [a, new Set()],
    [b, new Set()],
  ]);
  for (const [file, source] of [
    [a, 'import { b } from "./b.js";'],
    [b, 'export { a } from "./a.js";'],
  ]) {
    for (const specifier of moduleSpecifiersFrom(parse(file, source))) {
      const target = resolveSourceImport({
        importer: file,
        sourceRoot,
        sourceFiles: files,
        specifier,
      });
      if (target) graph.get(file).add(target);
    }
  }
  const cycles = findCycles(graph);
  assert.equal(cycles.length, 1);
  assert.deepEqual(new Set(cycles[0]), new Set([a, b]));
});

test("control: a type-only back reference does not create a runtime cycle", () => {
  const a = localPath("a.ts"),
    b = localPath("b.ts");
  const graph = new Map([
    [a, new Set([b])],
    [b, new Set()],
  ]);
  assert.deepEqual(moduleSpecifiersFrom(parse(b, 'import type { A } from "./a.js";')), []);
  assert.deepEqual(findCycles(graph), []);
});
