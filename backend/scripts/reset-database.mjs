#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const currentFilePath = fileURLToPath(import.meta.url);
const backendRoot = resolve(dirname(currentFilePath), "..");
const envPath = resolve(backendRoot, ".env");

if (existsSync(envPath)) {
  loadEnv({ path: envPath, quiet: true });
}

const scriptArgs = process.argv.slice(2);
const shouldSkipPrompt =
  process.env.LECTUM_CONFIRM_DB_RESET === "1" ||
  scriptArgs.includes("--force") ||
  scriptArgs.includes("-f") ||
  scriptArgs.includes("--yes") ||
  scriptArgs.includes("-y");

const prismaArgs = scriptArgs.filter(
  (arg) => !["--", "--force", "-f", "--yes", "-y"].includes(arg),
);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  fail("DATABASE_URL não encontrada. Configure backend/.env ou exporte a variável antes do reset.");
}

const parsedDatabaseUrl = parseDatabaseUrl(databaseUrl);
const databaseTarget = formatDatabaseTarget(parsedDatabaseUrl);

assertSafeDatabaseTarget(parsedDatabaseUrl);

console.log("⚠️  Reset total do banco de desenvolvimento Lectum.");
console.log(`Banco alvo: ${databaseTarget}`);
console.log("Todos os dados serão apagados e as migrations Prisma serão reaplicadas.");

if (!shouldSkipPrompt) {
  await confirmReset(databaseTarget);
}

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const resetResult = spawnSync(
  pnpmCommand,
  ["exec", "prisma", "migrate", "reset", "--force", ...prismaArgs],
  {
    cwd: backendRoot,
    env: process.env,
    stdio: "inherit",
  },
);

if (resetResult.error) {
  fail(`Falha ao executar pnpm exec prisma migrate reset: ${resetResult.error.message}`);
}

process.exit(resetResult.status ?? 1);

function parseDatabaseUrl(value) {
  try {
    return new URL(value);
  } catch {
    fail("DATABASE_URL inválida. O reset só é permitido com uma URL PostgreSQL válida.");
  }
}

function assertSafeDatabaseTarget(url) {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();

  if (nodeEnv === "production") {
    fail("Reset bloqueado: NODE_ENV=production.");
  }

  if (!isPostgresUrl(url)) {
    fail("Reset bloqueado: DATABASE_URL precisa usar protocolo postgresql:// ou postgres://.");
  }

  const targetLabel = `${url.hostname} ${url.pathname}`.toLowerCase();
  const isProbablyProduction = /(^|[^a-z])(prod|production|prd)([^a-z]|$)/i.test(targetLabel);

  if (isProbablyProduction) {
    fail("Reset bloqueado: o host ou nome do banco parece ser de produção.");
  }

  const allowNonLocal = process.env.LECTUM_ALLOW_NON_LOCAL_DB_RESET === "1";

  if (!allowNonLocal && !isLocalOrPrivateHost(url.hostname)) {
    fail(
      [
        "Reset bloqueado: o banco não parece local/privado.",
        "Use apenas bancos de desenvolvimento.",
        "Se for um ambiente dev descartável remoto, exporte LECTUM_ALLOW_NON_LOCAL_DB_RESET=1.",
      ].join("\n"),
    );
  }
}

function isPostgresUrl(url) {
  return url.protocol === "postgresql:" || url.protocol === "postgres:";
}

function isLocalOrPrivateHost(hostname) {
  const normalizedHost = hostname.toLowerCase();
  const localHosts = new Set([
    "localhost",
    "host.docker.internal",
    "db",
    "database",
    "postgres",
    "postgresql",
  ]);

  if (localHosts.has(normalizedHost) || normalizedHost.endsWith(".local")) {
    return true;
  }

  if (normalizedHost === "::1" || normalizedHost === "0.0.0.0") {
    return true;
  }

  if (net.isIP(normalizedHost) === 4) {
    return isPrivateIPv4(normalizedHost) || normalizedHost.startsWith("127.");
  }

  return false;
}

function isPrivateIPv4(hostname) {
  const [first = 0, second = 0] = hostname.split(".").map(Number);

  if (first === 10 || first === 192) {
    return first === 10 || second === 168;
  }

  return first === 172 && second >= 16 && second <= 31;
}

function formatDatabaseTarget(url) {
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));

  return `${url.protocol}//${url.hostname}:${url.port || "5432"}/${databaseName}`;
}

async function confirmReset(databaseTarget) {
  if (!input.isTTY || !output.isTTY) {
    fail(
      [
        "Reset cancelado: ambiente não interativo.",
        "Execute manualmente ou use pnpm db:reset -- --force em ambiente dev seguro.",
      ].join("\n"),
    );
  }

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`Digite RESET para apagar ${databaseTarget}: `);
  rl.close();

  if (answer !== "RESET") {
    fail("Reset cancelado pelo usuário.");
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
