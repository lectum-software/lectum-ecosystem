// Real local build + disposable PostgreSQL 18. No provider credentials, workspace .env or remote DB.
// Run after `pnpm --dir backend build`; Docker must already have postgres:18.6 locally.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

assert.equal(process.argv.length, 2, "Este harness não aceita URL, credencial ou banco externo.");
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(backend, "package.json"));
const suffix = randomBytes(10).toString("hex");
const container = `lectum-reconcile-db-${suffix}`;
const database = `lectum_reconcile_${suffix}`;
const labelKey = "lectum.reconciliation.integration";
const directory = mkdtempSync(path.join(tmpdir(), "lectum-reconcile-isolated-"));
chmodSync(directory, 0o700);
let stage = "prerequisites";
const docker = (args, timeout = 120_000) => {
  const result = spawnSync("docker", args, { encoding: "utf8", timeout });
  assert.equal(result.status, 0, "Etapa Docker falhou; saída privada omitida.");
  return result.stdout.trim();
};

try {
  assert.ok(
    existsSync(path.join(backend, "dist/operations/video-assets/reconcile-video-uploads.js")),
  );
  const image = docker(["image", "inspect", "--format", "{{.Id}}", "postgres:18.6"]);
  assert.match(image, /^sha256:[a-f0-9]{64}$/);
  const password = randomBytes(24).toString("hex");
  const config = path.join(directory, "database.config");
  writeFileSync(
    config,
    `POSTGRES_USER=lectum_audit\nPOSTGRES_DB=${database}\nPOSTGRES_PASSWORD=${password}\n`,
    { mode: 0o600 },
  );
  stage = "postgres_start";
  docker([
    "run",
    "--pull=never",
    "--rm",
    "-d",
    "--name",
    container,
    "--label",
    `${labelKey}=${suffix}`,
    "--memory",
    "768m",
    "--cpus",
    "2",
    "--pids-limit",
    "128",
    "--publish",
    "127.0.0.1::5432",
    "--env-file",
    config,
    "--tmpfs",
    "/var/lib/postgresql:rw,size=512m",
    image,
  ]);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync(
      "docker",
      ["exec", container, "pg_isready", "-U", "lectum_audit", "-d", database],
      { timeout: 5_000 },
    );
    if (result.status === 0) {
      ready = true;
      break;
    }
    await setTimeout(1_000);
  }
  assert.equal(ready, true);
  const binding = docker(["port", container, "5432/tcp"]);
  assert.match(binding, /^127\.0\.0\.1:\d+$/);
  // Explicit child env: no inherited DATABASE_URL, Cloudflare tokens, NODE_OPTIONS or dotenv config.
  const environment = {
    PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    NODE_ENV: "test",
    DATABASE_URL: `postgresql://lectum_audit:${password}@${binding}/${database}`,
    JWT_SECRET_KEY: randomBytes(32).toString("hex"),
    ADMIN_JWT_SECRET: randomBytes(32).toString("hex"),
    CRYPTO_ALGORITHM: "bcrypt",
    // These identify CLI confirmation semantics, not a network destination.
    BASE: "https://homolog-api.lectum.com.br",
    WEB_URL: "https://homolog.lectum.com.br",
  };
  console.log("ISOLATED_POSTGRES_READY");
  const prismaConfig = path.join(directory, "prisma.config.mjs");
  writeFileSync(
    prismaConfig,
    `import { defineConfig } from ${JSON.stringify(pathToFileURL(require.resolve("prisma/config")).href)};
export default defineConfig({
  schema: ${JSON.stringify(path.join(backend, "prisma/schema.prisma"))},
  migrations: { path: ${JSON.stringify(path.join(backend, "prisma/migrations"))} },
  datasource: { url: process.env.DATABASE_URL }
});`,
    { mode: 0o600 },
  );
  stage = "migrate_deploy";
  const migration = spawnSync(
    process.execPath,
    [require.resolve("prisma/build/index.js"), "migrate", "deploy", "--config", prismaConfig],
    {
      cwd: directory,
      env: environment,
      encoding: "utf8",
      timeout: 120_000,
    },
  );
  assert.equal(migration.status, 0, "Migrations do banco descartável falharam; saída omitida.");
  console.log("ISOLATED_MIGRATIONS_APPLIED");
  stage = "probe";
  const result = spawnSync(
    process.execPath,
    [
      path.join(backend, "scripts/video-upload-reconciliation-probe.cjs"),
      path.join(backend, "dist"),
      suffix,
    ],
    {
      cwd: directory,
      env: environment,
      encoding: "utf8",
      timeout: 120_000,
    },
  );
  for (const line of `${result.stdout || ""}\n${result.stderr || ""}`.split("\n")) {
    if (/^(CHECK_OK|CHECK_FAIL|PROBE_SUMMARY|VIDEO_RECONCILIATION_POSTGRES_OK)( |$)/.test(line))
      console.log(line);
  }
  assert.equal(result.status, 0);
  const lines = (result.stdout || "").split("\n");
  const summary = lines.filter((line) => line.startsWith("PROBE_SUMMARY "));
  assert.equal(summary.length, 1);
  assert.deepEqual(JSON.parse(summary[0].slice("PROBE_SUMMARY ".length)), {
    passed: 16,
    failed: 0,
    total: 16,
  });
  assert.ok(lines.includes("VIDEO_RECONCILIATION_POSTGRES_OK"));
} catch {
  console.error("ISOLATED_RECONCILIATION_INTEGRATION_FAILED", stage);
  process.exitCode = 1;
} finally {
  // Never remove an unowned database/container; no published resource or volume is referenced.
  const owned = spawnSync(
    "docker",
    ["inspect", "--format", `{{ index .Config.Labels "${labelKey}" }}`, container],
    { encoding: "utf8", timeout: 5_000 },
  );
  let cleanupFailed = false;
  if (owned.status === 0 && owned.stdout.trim() === suffix) {
    try {
      docker(["rm", "-f", container]);
    } catch {
      cleanupFailed = true;
    }
  }
  rmSync(directory, { recursive: true, force: true });
  if (cleanupFailed) {
    console.error("ISOLATED_RESOURCES_CLEANUP_FAILED");
    process.exitCode = 1;
  } else console.log("ISOLATED_RESOURCES_REMOVED");
}
