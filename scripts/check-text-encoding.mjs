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
  ".hbs",
  ".js",
  ".json",
  ".jsonc",
  ".md",
  ".mdc",
  ".mjs",
  ".prisma",
  ".sh",
  ".sql",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const textBasenames = new Set([
  ".builderignore",
  ".builderrules",
  ".css",
  ".dockerignore",
  ".gitattributes",
  ".gitignore",
  "Dockerfile",
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
const forbiddenControlCharacterPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

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
  .filter(
    (file) =>
      textExtensions.has(path.extname(file).toLowerCase()) || textBasenames.has(path.basename(file)),
  );

const failures = [];

for (const relativePath of files) {
  if (immutableLegacyEncodingExceptions.has(relativePath)) continue;

  const content = await readFile(path.join(repositoryRoot, relativePath), "utf8");
  if (content.charCodeAt(0) === 0xfeff) {
    failures.push(`${relativePath}:1 (BOM UTF-8 desnecessário)`);
  }
  const lines = content.split(/\r?\n/u);
  const extension = path.extname(relativePath).toLowerCase();
  const isMarkdown = extension === ".md";
  const checksQuestionMarkCorruption = isMarkdown || extension === ".svg";
  let insideCodeFence = false;

  for (const [index, line] of lines.entries()) {
    if (forbiddenControlCharacterPattern.test(line)) {
      failures.push(`${relativePath}:${index + 1} (caractere de controle inesperado)`);
    }

    if (mojibakePattern.test(line)) {
      failures.push(`${relativePath}:${index + 1}`);
    }

    if (!checksQuestionMarkCorruption) continue;
    if (isMarkdown && line.trimStart().startsWith("```")) {
      insideCodeFence = !insideCodeFence;
      continue;
    }
    if (isMarkdown && insideCodeFence) continue;

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
  console.log(
    `[encoding] OK: ${files.length} arquivos textuais com UTF-8 íntegro e sem controles inesperados.`,
  );
}
