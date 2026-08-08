import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(backendRoot, "src");
const packageJson = JSON.parse(await readFile(path.join(backendRoot, "package.json"), "utf8"));
const productionDependencies = new Set(Object.keys(packageJson.dependencies || {}));
const developmentDependencies = new Set(Object.keys(packageJson.devDependencies || {}));
const sourceExtensions = [".ts", ".tsx", ".js", ".mjs", ".cjs"];
const visited = new Set();
const failures = [];

const packageNameFromSpecifier = (specifier) => {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");

  return specifier.split("/")[0];
};

const resolveSourceImport = async (currentFile, specifier) => {
  const unresolved = specifier.startsWith("@/")
    ? path.join(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(currentFile), specifier);
  const candidates = [
    unresolved,
    ...sourceExtensions.map((extension) => `${unresolved}${extension}`),
    ...sourceExtensions.map((extension) => path.join(unresolved, `index${extension}`)),
  ];

  for (const candidate of candidates) {
    try {
      const stats = await stat(candidate);
      if (stats.isFile()) return candidate;
    } catch {
      // Tenta a próxima extensão suportada.
    }
  }

  return null;
};

const collectSpecifiers = (content) => {
  const specifiers = new Set();
  const patterns = [
    /(?:^|\n)\s*import\s+(?!type\b)(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /(?:^|\n)\s*export\s+(?!type\b)[\s\S]*?\s+from\s+["']([^"']+)["']/g,
    /\b(?:import|require)\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) specifiers.add(match[1]);
  }

  return specifiers;
};

const visit = async (absolutePath) => {
  if (visited.has(absolutePath)) return;
  visited.add(absolutePath);

  const content = await readFile(absolutePath, "utf8");
  for (const specifier of collectSpecifiers(content)) {
    if (specifier.startsWith("node:")) continue;

    if (
      specifier === "." ||
      specifier === ".." ||
      specifier.startsWith("./") ||
      specifier.startsWith("../") ||
      specifier.startsWith("@/")
    ) {
      const resolved = await resolveSourceImport(absolutePath, specifier);
      if (resolved) await visit(resolved);
      continue;
    }

    const packageName = packageNameFromSpecifier(specifier);
    if (productionDependencies.has(packageName)) continue;

    const relativePath = path.relative(backendRoot, absolutePath);
    if (developmentDependencies.has(packageName)) {
      failures.push(`${relativePath}: ${packageName} está apenas em devDependencies.`);
    } else {
      failures.push(`${relativePath}: ${packageName} não está declarado em dependencies.`);
    }
  }
};

await visit(path.join(sourceRoot, "index.ts"));

if (failures.length > 0) {
  console.error("[runtime-deps] A imagem de produção perderia dependências usadas no boot:\n");
  [...new Set(failures)].forEach((failure) => {
    console.error(`- ${failure}`);
  });
  process.exitCode = 1;
} else {
  console.log(
    `[runtime-deps] OK: ${visited.size} módulos alcançáveis pelo backend usam dependências de produção.`,
  );
}
