import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".example",
  ".js",
  ".json",
  ".jsonc",
  ".md",
  ".mjs",
  ".prisma",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const mojibakePattern = new RegExp(
  [
    "\\u00c3(?=[\\u0080-\\u00bf\\u0192\\u00c6\\u201a])",
    "\\u00c2(?=[\\u0080-\\u00bf\\u0192\\u00c6])",
    "\\u00e2(?:\\u20ac|\\u2122|\\u0153|\\u201c|\\u201d|\\u20ac\\u00a2|\\u2020|\\u2021)",
    "\\ufffd",
    "\\u00c6\\u2019",
    "\\u0192",
  ].join("|"),
  "u",
);
const questionMarkCorruptionPattern =
  /[A-Za-zÀ-ÿ]\?+[A-Za-zÀ-ÿ]|\?{2,}|(?:^|\s)\?[A-Za-zÀ-ÿ]{2,}|\s\?\s/u;

// Esta migration histórica foi gravada em Latin-1 antes da política de UTF-8.
// Reescrevê-la quebraria o checksum do Prisma em bancos onde já foi aplicada.
const immutableLegacyEncodingExceptions = new Set([
  "backend/prisma/migrations/20260611140000_add_specialty_catalog_options/migration.sql",
]);

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
  cwd: repositoryRoot,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean)
  .filter((file) => existsSync(path.join(repositoryRoot, file)))
  .filter((file) => textExtensions.has(path.extname(file).toLowerCase()));

const failures = [];

for (const relativePath of files) {
  if (immutableLegacyEncodingExceptions.has(relativePath)) continue;

  const content = await readFile(path.join(repositoryRoot, relativePath), "utf8");
  const lines = content.split(/\r?\n/u);
  const isMarkdown = path.extname(relativePath).toLowerCase() === ".md";
  let insideCodeFence = false;

  for (const [index, line] of lines.entries()) {
    if (mojibakePattern.test(line)) {
      failures.push(`${relativePath}:${index + 1}`);
    }

    if (!isMarkdown) continue;
    if (line.trimStart().startsWith("```")) {
      insideCodeFence = !insideCodeFence;
      continue;
    }
    if (insideCodeFence) continue;

    const prose = line.replace(/`[^`]*`/gu, "").replace(/https?:\/\/\S+/gu, "");
    if (questionMarkCorruptionPattern.test(prose)) {
      failures.push(`${relativePath}:${index + 1} (possível acento substituído por ?)`);
    }
  }
}

if (failures.length > 0) {
  console.error("[encoding] Texto com UTF-8 corrompido ou caractere de substituição encontrado:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[encoding] OK: ${files.length} arquivos textuais sem mojibake ou U+FFFD.`);
}
