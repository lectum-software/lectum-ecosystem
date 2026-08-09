import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adrDirectory = path.join(repositoryRoot, "adrs");
const adrFilenamePattern = /^(\d{4})-[a-z0-9-]+\.md$/u;
const headingPattern = /^#\s+ADR[- ]?(\d{4})\s*(?::|[-–—])\s*\S/u;
const indexEntryPattern = /^- \[ADR-(\d{4})\s+—\s+.+\]\((\d{4}-[^)]+\.md)\)$/u;

const adrFiles = readdirSync(adrDirectory)
  .filter((filename) => adrFilenamePattern.test(filename))
  .sort((left, right) => left.localeCompare(right, "pt-BR"));
const failures = [];
const filesById = new Map();

for (const filename of adrFiles) {
  const filenameId = filename.slice(0, 4);
  const sameIdFiles = filesById.get(filenameId) ?? [];
  sameIdFiles.push(filename);
  filesById.set(filenameId, sameIdFiles);

  const content = readFileSync(path.join(adrDirectory, filename), "utf8").replace(/^\uFEFF/u, "");
  const firstHeading = content.split(/\r?\n/u).find((line) => line.trim().length > 0) ?? "";
  const headingId = firstHeading.match(headingPattern)?.[1];

  if (headingId !== filenameId) {
    failures.push(`${filename}: o título deve começar com ADR-${filenameId}.`);
  }
}

for (const [id, filenames] of filesById) {
  if (filenames.length > 1) {
    failures.push(`ADR-${id} duplicado em: ${filenames.join(", ")}.`);
  }
}

const indexContent = readFileSync(path.join(adrDirectory, "README.md"), "utf8");
const indexedFiles = new Map();

for (const line of indexContent.split(/\r?\n/u)) {
  const match = line.match(indexEntryPattern);
  if (!match) continue;

  const [, labelId, filename] = match;
  if (labelId !== filename.slice(0, 4)) {
    failures.push(`README.md: o rótulo ADR-${labelId} não corresponde a ${filename}.`);
  }

  indexedFiles.set(filename, (indexedFiles.get(filename) ?? 0) + 1);
}

for (const filename of adrFiles) {
  const occurrences = indexedFiles.get(filename) ?? 0;
  if (occurrences !== 1) {
    failures.push(`README.md: ${filename} deve aparecer uma vez; encontrado ${occurrences}.`);
  }
}

for (const filename of indexedFiles.keys()) {
  if (!adrFiles.includes(filename)) {
    failures.push(`README.md: referência inexistente ${filename}.`);
  }
}

if (failures.length > 0) {
  console.error("[adrs] Integridade dos registros de decisão inválida:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[adrs] OK: ${adrFiles.length} ADRs com número único, título e índice íntegros.`);
}
