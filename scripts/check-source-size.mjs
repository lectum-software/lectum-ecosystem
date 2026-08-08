import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(repositoryRoot, "scripts/source-size-baseline.json");
const sourceRoots = ["backend/src", "frontend/src", "admin/src"];
const sourceExtensions = new Set([".cjs", ".js", ".mjs", ".ts", ".tsx"]);
const ignoredSegments = new Set(["generated"]);
const defaultMaximumLines = 700;
const compositionRootMaximumLines = 600;

const isCompositionRoot = (relativePath) =>
  /^(?:frontend|admin)\/src\/app\/(?:.*\/)?(?:client|logic|page)\.tsx$/.test(relativePath) ||
  /^backend\/src\/modules\/api\/.+\/use-cases\/(?:controller|services)\.ts$/.test(relativePath);

const maximumLinesFor = (relativePath) =>
  isCompositionRoot(relativePath) ? compositionRootMaximumLines : defaultMaximumLines;

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredSegments.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
    } else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
};

const countLines = (content) => content.replace(/^\uFEFF/, "").split(/\r?\n/).length;

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const current = new Map();

for (const sourceRoot of sourceRoots) {
  const files = await walk(path.join(repositoryRoot, sourceRoot));
  for (const absolutePath of files) {
    const relativePath = path.relative(repositoryRoot, absolutePath);
    current.set(relativePath, countLines(await readFile(absolutePath, "utf8")));
  }
}

const failures = [];

for (const [relativePath, lines] of current) {
  const acceptedLegacySize = baseline[relativePath];
  const maximumLines = maximumLinesFor(relativePath);

  if (lines <= maximumLines) {
    if (acceptedLegacySize !== undefined) {
      failures.push(
        `${relativePath}: caiu para ${lines} linhas; remova-o do baseline para consolidar a melhoria.`,
      );
    }
    continue;
  }

  if (acceptedLegacySize === undefined) {
    failures.push(
      `${relativePath}: possui ${lines} linhas; o limite desta categoria é ${maximumLines}.`,
    );
    continue;
  }

  if (lines > acceptedLegacySize) {
    failures.push(
      `${relativePath}: cresceu de ${acceptedLegacySize} para ${lines} linhas; extraia responsabilidades antes de continuar.`,
    );
  } else if (lines < acceptedLegacySize) {
    failures.push(
      `${relativePath}: foi reduzido para ${lines} linhas; atualize o baseline de ${acceptedLegacySize} para ${lines}.`,
    );
  }
}

if (failures.length > 0) {
  console.error("[source-size] A arquitetura não permite aumentar arquivos legados grandes:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `[source-size] OK: raízes de composição limitadas a ${compositionRootMaximumLines} linhas, demais fontes a ${defaultMaximumLines} e dívida legada sem crescimento.`,
  );
}
