import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
  cwd: repositoryRoot,
})
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const ignoredFiles = new Set([
  "admin/pnpm-lock.yaml",
  "backend/pnpm-lock.yaml",
  "frontend/pnpm-lock.yaml",
  "pnpm-lock.yaml",
]);
const binaryExtensions = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".webp",
]);
const placeholderPattern = /(?:change|example|replace|sample|your|xxx|\*{3}|\.{3})/i;
const secretPatterns = [
  { label: "chave privada", pattern: /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/g },
  { label: "AWS access key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { label: "Google OAuth secret", pattern: /\bGOCSPX-[A-Za-z0-9_-]{20,}\b/g },
  { label: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g },
  { label: "OpenAI key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g },
  { label: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { label: "Mercado Pago token", pattern: /\b(?:APP_USR|TEST)-[A-Za-z0-9_-]{24,}\b/g },
  { label: "SendGrid key", pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{20,}\b/g },
  {
    label: "e-mail pessoal em provedor público",
    pattern: /\b[A-Za-z0-9._%+-]+@(?:gmail|hotmail|outlook|yahoo)\.[A-Za-z]{2,}\b/gi,
  },
];
const sensitiveAssignmentPattern =
  /^[ \t]*(?:export[ \t]+)?([A-Z][A-Z0-9_]*(?:API_KEY|AUTH_TOKEN|PASSWORD|PRIVATE_KEY|SECRET|TOKEN)[A-Z0-9_]*)[ \t]*=[ \t]*["']?([^\s"'#]{12,})/gm;
const failures = [];

for (const relativePath of candidates) {
  if (ignoredFiles.has(relativePath) || binaryExtensions.has(path.extname(relativePath).toLowerCase())) {
    continue;
  }

  let content;
  try {
    content = await readFile(path.join(repositoryRoot, relativePath), "utf8");
  } catch {
    continue;
  }

  if (content.includes("\0")) continue;

  for (const { label, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      if (placeholderPattern.test(match[0])) continue;

      const line = content.slice(0, match.index).split(/\r?\n/).length;
      failures.push(`${relativePath}:${line} (${label})`);
    }
  }

  sensitiveAssignmentPattern.lastIndex = 0;
  for (const match of content.matchAll(sensitiveAssignmentPattern)) {
    if (match[1].startsWith("NEXT_PUBLIC_")) continue;
    if (placeholderPattern.test(match[2])) continue;

    const line = content.slice(0, match.index).split(/\r?\n/).length;
    failures.push(`${relativePath}:${line} (valor sensível em ${match[1]})`);
  }
}

if (failures.length > 0) {
  console.error("[secrets] Possíveis credenciais versionadas foram bloqueadas:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("[secrets] OK: nenhuma credencial de alta confiança encontrada em arquivos versionáveis.");
}
