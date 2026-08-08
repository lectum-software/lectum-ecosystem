import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceExtensions = new Set([".cjs", ".js", ".mjs", ".sh", ".ts", ".tsx"]);
const ignoredSegments = new Set([".next", "coverage", "dist", "generated", "node_modules"]);
const platformVariables = new Set(["CI", "NODE_ENV"]);
const applicationDefinitions = [
  {
    example: "backend/.env.example",
    name: "backend",
    roots: ["backend", "scripts/dev.mjs"],
  },
  {
    example: "frontend/.env.example",
    name: "frontend",
    roots: ["frontend"],
  },
  {
    example: "admin/.env.example",
    name: "admin",
    roots: ["admin"],
  },
];

const walk = async (entryPath) => {
  const absolutePath = path.join(repositoryRoot, entryPath);
  const entries = await readdir(absolutePath, { withFileTypes: true }).catch(() => null);

  if (!entries) return [absolutePath];

  const files = [];
  for (const entry of entries) {
    if (ignoredSegments.has(entry.name)) continue;

    const relativePath = path.join(entryPath, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(relativePath)));
    else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(path.join(repositoryRoot, relativePath));
    }
  }

  return files;
};

const readExampleKeys = async (relativePath) => {
  const content = await readFile(path.join(repositoryRoot, relativePath), "utf8");
  const keys = new Set();

  for (const line of content.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/);
    if (match) keys.add(match[1]);
  }

  return keys;
};

const collectEnvironmentReferences = (content, { isShell = false } = {}) => {
  const references = new Set();
  const patterns = [
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
    /process\.env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
    /\benv\(\s*["']([A-Z][A-Z0-9_]*)["']\s*\)/g,
  ];

  if (isShell) patterns.push(/\$\{([A-Z][A-Z0-9_]*)(?=[:}?+\-])/g);

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) references.add(match[1]);
  }

  return references;
};

const failures = [];

for (const definition of applicationDefinitions) {
  const documentedKeys = await readExampleKeys(definition.example);
  const references = new Map();

  for (const root of definition.roots) {
    for (const absolutePath of await walk(root)) {
      if (!sourceExtensions.has(path.extname(absolutePath))) continue;

      const content = await readFile(absolutePath, "utf8");
      const relativePath = path.relative(repositoryRoot, absolutePath);
      for (const key of collectEnvironmentReferences(content, { isShell: absolutePath.endsWith(".sh") })) {
        if (!references.has(key)) references.set(key, new Set());
        references.get(key).add(relativePath);

        const isClientModule = /^\s*["']use client["'];/u.test(content.replace(/^\uFEFF/, ""));
        if (
          isClientModule &&
          key !== "NODE_ENV" &&
          !key.startsWith("NEXT_PUBLIC_")
        ) {
          failures.push(`${relativePath}: ${key} não pode ser lida em módulo de navegador.`);
        }
      }
    }
  }

  for (const [key, files] of references) {
    if (platformVariables.has(key) || documentedKeys.has(key)) continue;

    failures.push(
      `${definition.name}: ${key} é usada por ${Array.from(files).join(", ")}, mas não está em ${definition.example}.`,
    );
  }
}

if (failures.length > 0) {
  console.error("[env-examples] Variáveis não documentadas podem quebrar homologação/produção:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    "[env-examples] OK: variáveis referenciadas estão documentadas e módulos client não leem segredos.",
  );
}
