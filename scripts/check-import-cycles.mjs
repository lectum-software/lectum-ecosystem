import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireFromBackend = createRequire(path.join(repositoryRoot, "backend/package.json"));
const ts = requireFromBackend("typescript");

const applications = ["backend", "frontend", "admin"];
const sourceExtensions = [".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"];
const ignoredSegments = new Set(["generated"]);

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredSegments.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
    } else if (entry.isFile() && sourceExtensions.includes(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
};

const isRuntimeImport = (importClause) => {
  if (!importClause) return true;
  if (importClause.isTypeOnly || importClause.name) return !importClause.isTypeOnly;
  if (!importClause.namedBindings || !ts.isNamedImports(importClause.namedBindings)) return true;

  return importClause.namedBindings.elements.some((element) => !element.isTypeOnly);
};

const isRuntimeExport = (statement) => {
  if (statement.isTypeOnly) return false;
  if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) return true;

  return statement.exportClause.elements.some((element) => !element.isTypeOnly);
};

const moduleSpecifiersFrom = (sourceFile) => {
  const specifiers = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      isRuntimeImport(statement.importClause)
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }

    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      isRuntimeExport(statement)
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }

  return specifiers;
};

const resolveSourceImport = ({ importer, sourceRoot, sourceFiles, specifier }) => {
  let unresolvedPath;

  if (specifier.startsWith("@/")) {
    unresolvedPath = path.join(sourceRoot, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    unresolvedPath = path.resolve(path.dirname(importer), specifier);
  } else {
    return null;
  }

  const candidates = [unresolvedPath];
  for (const extension of sourceExtensions) candidates.push(`${unresolvedPath}${extension}`);
  for (const extension of sourceExtensions) {
    candidates.push(path.join(unresolvedPath, `index${extension}`));
  }

  return candidates.find((candidate) => sourceFiles.has(path.normalize(candidate))) ?? null;
};

const canonicalCycleKey = (cycle) =>
  [...new Set(cycle.slice(0, -1))].sort((left, right) => left.localeCompare(right)).join("|");

const findCycles = (graph) => {
  const state = new Map();
  const stack = [];
  const cycles = [];
  const seenCycles = new Set();

  const visit = (file) => {
    state.set(file, "visiting");
    stack.push(file);

    for (const dependency of graph.get(file) ?? []) {
      if (!state.has(dependency)) {
        visit(dependency);
        continue;
      }

      if (state.get(dependency) !== "visiting") continue;

      const cycleStart = stack.lastIndexOf(dependency);
      const cycle = [...stack.slice(cycleStart), dependency];
      const key = canonicalCycleKey(cycle);
      if (!seenCycles.has(key)) {
        seenCycles.add(key);
        cycles.push(cycle);
      }
    }

    stack.pop();
    state.set(file, "visited");
  };

  for (const file of graph.keys()) {
    if (!state.has(file)) visit(file);
  }

  return cycles;
};

const failures = [];

for (const application of applications) {
  const sourceRoot = path.join(repositoryRoot, application, "src");
  const files = await walk(sourceRoot);
  const sourceFiles = new Set(files.map((file) => path.normalize(file)));
  const graph = new Map(files.map((file) => [file, new Set()]));

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      false,
      file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    for (const specifier of moduleSpecifiersFrom(sourceFile)) {
      const dependency = resolveSourceImport({ importer: file, sourceRoot, sourceFiles, specifier });
      if (dependency) graph.get(file).add(dependency);
    }
  }

  for (const cycle of findCycles(graph)) {
    failures.push(
      `${application}: ${cycle.map((file) => path.relative(sourceRoot, file)).join(" -> ")}`,
    );
  }
}

if (failures.length > 0) {
  console.error("[import-cycles] Dependências circulares entre módulos locais foram encontradas:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("[import-cycles] OK: backend, frontend e admin sem ciclos entre módulos locais.");
}
