import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const applicationRoots = ["admin/src/", "backend/src/", "frontend/src/"];
const sourceExtensionPattern = /\.(?:cjs|css|js|mjs|ts|tsx)$/u;
const forbiddenPatterns = [
  { label: "elemento <img> cru", pattern: /<img(?:\s|>)/u },
  { label: "HTML injetado", pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/u },
  { label: "execução dinâmica", pattern: /\beval\s*\(|\bnew\s+Function\b/u },
  { label: "JavaScript em URL", pattern: /javascript:/iu },
  { label: "SQL Prisma sem parametrização", pattern: /\$(?:execute|query)RawUnsafe\s*\(/u },
  { label: "processo filho em runtime", pattern: /(?:node:)?child_process/u },
  { label: "import da pasta sample", pattern: /(?:from\s+|import\s*\()["'][^"']*sample\//u },
  {
    label: "erro técnico exibido diretamente",
    pattern: /toast\.(?:error|warning)\s*\([^\n]*\b\w*(?:error|err)\w*\??\.message/iu,
  },
  {
    label: "token/usuário persistido em localStorage",
    pattern: /localStorage\.setItem\s*\([^\n]*(?:token|jwt|user)/iu,
  },
];
const reservedRouteFilePattern =
  /\/(?:components|hooks|modules|queries|support|views)\/(?:default|error|layout|loading|not-found|page|route|template)\.(?:ts|tsx)$/u;
const rawUiColorPattern = /#[0-9a-f]{3,8}\b|\brgba?\s*\(/iu;
const namedTailwindPalettePattern =
  /(?:[a-z-]+:)*(?:bg|text|border|fill|stroke|ring|outline|shadow|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-[0-9]{2,3})?(?:\/(?:[0-9]{1,3}|\[[^\]]+\]))?/u;
const arbitraryUiColorPattern =
  /(?:bg|text|border|fill|stroke|ring|outline|shadow|from|via|to)-\[[^\]]*(?:#|rgba?|hsla?)\s*\(?/iu;
const uiMockPattern = /\b(?:mock(?:s|ed|ing)?|fake|fixture|dummy)(?:[_A-Z]|\b)/u;
const uiImplementationLanguagePattern =
  /dados reais|upload real|chaves VAPID|encontrad[ao]s? no backend|auditoria administrativa|dados coarse|\bde visitor_location\b|preço hardcoded|extraível no payload|\bo endpoint (?:não|nao) retorna|criada no backend|fundação backend|conexão segura com a API automática|neste MVP|persistência real|preview no Admin|redirect interno opcional|analytics first-party|porta local|\b(?:nenhum|nenhuma|sem|carregando)[^"'<>\n]{0,80}\breais?\b|\b(?:dados|métricas?|atividades?|denúncias?|publicações?|entregas?|assinaturas?|pacientes?|conversões?|eventos|sessões|posts?) reais?\b/iu;
const uiRawSourceMetadataPatterns = [
  /(?:title|source)=\{[^}\n]*\.source\b/u,
  />[^<>{}]*\{[^}\n]*\.source\b[^}\n]*\}/u,
];
const backendNaturalLanguageImplementationPattern =
  /(["'`])(?=[^"'`\n]*\s)[^"'`\n]*(?:\b(?:payment_event|professional_subscription|visitor_location|visitor_session|user_token|page_view_event|first-party|coarse|pageviews?|duration_seconds)\b|payload bruto|heartbeat\/beacon|endpoint real)[^"'`\n]*\1/iu;

// Exceções são pontes técnicas centralizadas, não autorização para cores em componentes:
// manifests exigem literais, canvas precisa de fallbacks serializáveis e paletas de comunidade
// persistem cores configuráveis pelo usuário. globals.css é a própria fonte dos tokens visuais.
const rawUiColorWholeFileExceptions = new Set([
  "admin/src/app/globals.css",
  "admin/src/app/layout.tsx",
  "admin/src/lib/community-visual.ts",
  "admin/src/lib/visual-tokens.ts",
  "frontend/src/app/app/community/[slug]/modules/palette.ts",
  "frontend/src/app/globals.css",
  "frontend/src/app/manifest.ts",
  "frontend/src/utils/lectum-share-media/layout.ts",
]);
const rawUiColorLineExceptions = new Map([
  [
    "admin/src/app/(admin)/comunidades/nova/client.tsx",
    [/cor hexadecimal no formato #[0-9a-f]{6}/iu, /placeholder="#[0-9a-f]{6}"/iu],
  ],
  [
    "admin/src/app/(admin)/comunidades/[slug]/components/community-edit-form.tsx",
    [/placeholder="#[0-9a-f]{6}"/iu],
  ],
]);

// Estes arquivos são ports locais de packages legados cujo contrato público depende de
// introspecção dinâmica. A lista fechada impede que a desativação do TypeScript se espalhe
// para código de produto enquanto a compatibilidade é preservada sem breaking changes.
const typecheckCompatibilityExceptions = new Set([
  "backend/src/packages/seed/index.ts",
  "backend/src/packages/seed/reset.ts",
  "backend/src/packages/swagger/index.ts",
  "backend/src/packages/swagger/utils/analyze.ts",
  "backend/src/packages/swagger/utils/validators.ts",
  "backend/src/packages/validator/index.ts",
  "backend/src/packages/validator/schema/_internal/fines/prefine.ts",
  "backend/src/packages/validator/schema/_internal/fines/refines.ts",
  "backend/src/packages/validator/schema/_internal/handlers/error.ts",
  "backend/src/packages/validator/web.ts",
]);

const isUiSource = (relativePath) =>
  relativePath.startsWith("frontend/src/") || relativePath.startsWith("admin/src/");

const isBackendResponseSurface = (relativePath) =>
  relativePath.startsWith("backend/src/modules/api/") ||
  relativePath.startsWith("backend/src/utils/admin-");

const allowsRawUiColor = (relativePath, line) =>
  rawUiColorWholeFileExceptions.has(relativePath) ||
  (rawUiColorLineExceptions.get(relativePath) ?? []).some((pattern) => pattern.test(line));

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
  cwd: repositoryRoot,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean)
  .filter((file) => existsSync(path.join(repositoryRoot, file)))
  .filter(
    (file) =>
      applicationRoots.some((root) => file.startsWith(root)) && sourceExtensionPattern.test(file),
  )
  .filter((file) => !file.startsWith("backend/src/external/generated/"));

const failures = [];

for (const relativePath of files) {
  if (
    (relativePath.startsWith("frontend/src/app/") || relativePath.startsWith("admin/src/app/")) &&
    reservedRouteFilePattern.test(relativePath)
  ) {
    failures.push(`${relativePath}: arquivo reservado do App Router dentro de módulo interno`);
  }

  const content = await readFile(path.join(repositoryRoot, relativePath), "utf8");
  const lines = content.split(/\r?\n/u);

  if (content.includes("@ts-nocheck") && !typecheckCompatibilityExceptions.has(relativePath)) {
    failures.push(`${relativePath}: @ts-nocheck fora do limite de compatibilidade`);
  }

  for (const [index, line] of lines.entries()) {
    for (const check of forbiddenPatterns) {
      if (check.pattern.test(line)) {
        failures.push(`${relativePath}:${index + 1}: ${check.label}`);
      }
    }

    if (
      isBackendResponseSurface(relativePath) &&
      !/^\s*source\s*:/u.test(line) &&
      backendNaturalLanguageImplementationPattern.test(line)
    ) {
      failures.push(`${relativePath}:${index + 1}: detalhe interno em texto de resposta`);
    }

    if (!isUiSource(relativePath)) continue;

    if (uiMockPattern.test(line)) {
      failures.push(`${relativePath}:${index + 1}: mock ou dado artificial em código de produto`);
    }

    if (uiImplementationLanguagePattern.test(line)) {
      failures.push(`${relativePath}:${index + 1}: linguagem interna exposta na interface`);
    }

    if (uiRawSourceMetadataPatterns.some((pattern) => pattern.test(line))) {
      failures.push(`${relativePath}:${index + 1}: metadado técnico exibido na interface`);
    }

    if (namedTailwindPalettePattern.test(line)) {
      failures.push(`${relativePath}:${index + 1}: cor Tailwind fora dos tokens semânticos`);
    }

    if (arbitraryUiColorPattern.test(line)) {
      failures.push(`${relativePath}:${index + 1}: cor arbitrária embutida em utility class`);
    }

    if (rawUiColorPattern.test(line) && !allowsRawUiColor(relativePath, line)) {
      failures.push(`${relativePath}:${index + 1}: cor hardcoded fora da fonte de tokens`);
    }
  }
}

const backendPackage = JSON.parse(
  await readFile(path.join(repositoryRoot, "backend/package.json"), "utf8"),
);
for (const [name, command] of Object.entries(backendPackage.scripts ?? {})) {
  if (typeof command === "string" && /prisma\s+db\s+push/u.test(command)) {
    failures.push(`backend/package.json#scripts.${name}: prisma db push não é permitido`);
  }
}

if (failures.length > 0) {
  console.error("[source-safety] Padrões incompatíveis com o runtime publicado:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[source-safety] OK: ${files.length} fontes verificadas.`);
}
